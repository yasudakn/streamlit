# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import asyncio
import os
import shutil
import tempfile
from typing import List
from unittest.mock import MagicMock, patch

import pytest

import streamlit
from streamlit.proto.ForwardMsg_pb2 import ForwardMsg
from streamlit.runtime.forward_msg_cache import populate_hash_if_needed
from streamlit.runtime.runtime import (
    RuntimeState,
    SessionClient,
    Runtime,
    RuntimeConfig,
    RuntimeStoppedError,
    SessionClientDisconnectedError,
    AsyncObjects,
)
from streamlit.runtime.uploaded_file_manager import UploadedFileRec
from streamlit.runtime.memory_media_file_storage import MemoryMediaFileStorage
from streamlit.watcher import event_based_path_watcher
from tests.streamlit.message_mocks import (
    create_dataframe_msg,
    create_script_finished_message,
)
from tests.testutil import patch_config_options
from .runtime_test_case import RuntimeTestCase


class MockSessionClient(SessionClient):
    """A SessionClient that captures all its ForwardMsgs into a list."""

    def __init__(self):
        self.forward_msgs: List[ForwardMsg] = []

    def write_forward_msg(self, msg: ForwardMsg) -> None:
        self.forward_msgs.append(msg)


class RuntimeTest(RuntimeTestCase):
    async def test_start_stop(self):
        """starting and stopping the Runtime should work as expected."""
        self.assertEqual(RuntimeState.INITIAL, self.runtime.state)

        await self.runtime.start()
        self.assertEqual(RuntimeState.NO_SESSIONS_CONNECTED, self.runtime.state)

        self.runtime.stop()
        await asyncio.sleep(0)  # Wait 1 tick for the stop to be acknowledged
        self.assertEqual(RuntimeState.STOPPING, self.runtime.state)

        await self.runtime.stopped
        self.assertEqual(RuntimeState.STOPPED, self.runtime.state)

    async def test_create_session(self):
        """We can create and remove a single session."""
        await self.runtime.start()

        session_id = self.runtime.create_session(
            client=MockSessionClient(), user_info=MagicMock()
        )
        self.assertEqual(
            RuntimeState.ONE_OR_MORE_SESSIONS_CONNECTED, self.runtime.state
        )

        self.runtime.close_session(session_id)
        self.assertEqual(RuntimeState.NO_SESSIONS_CONNECTED, self.runtime.state)

    async def test_close_session_shuts_down_appsession(self):
        """Closing a session should shutdown its associated AppSession."""
        with self.patch_app_session():
            await self.runtime.start()

            # Create a session and get its associated AppSession object.
            session_id = self.runtime.create_session(
                client=MockSessionClient(), user_info=MagicMock()
            )
            app_session = self.runtime._get_session_info(session_id).session

            # Close the session. AppSession.shutdown should be called.
            self.runtime.close_session(session_id)
            app_session.shutdown.assert_called_once()

    async def test_multiple_sessions(self):
        """Multiple sessions can be connected."""
        await self.runtime.start()

        session_ids = []
        for _ in range(3):
            session_id = self.runtime.create_session(
                client=MockSessionClient(),
                user_info=MagicMock(),
            )

            self.assertEqual(
                RuntimeState.ONE_OR_MORE_SESSIONS_CONNECTED, self.runtime.state
            )
            session_ids.append(session_id)

        for i in range(len(session_ids)):
            self.runtime.close_session(session_ids[i])
            expected_state = (
                RuntimeState.NO_SESSIONS_CONNECTED
                if i == len(session_ids) - 1
                else RuntimeState.ONE_OR_MORE_SESSIONS_CONNECTED
            )
            self.assertEqual(expected_state, self.runtime.state)

        self.assertEqual(RuntimeState.NO_SESSIONS_CONNECTED, self.runtime.state)

    async def test_close_invalid_session(self):
        """Closing a session that doesn't exist is a no-op: no error raised."""
        await self.runtime.start()

        # Close a session that never existed
        self.runtime.close_session("no_such_session")

        # Close a valid session twice
        session_id = self.runtime.create_session(
            client=MockSessionClient(), user_info=MagicMock()
        )
        self.runtime.close_session(session_id)
        self.runtime.close_session(session_id)

    async def test_is_active_session(self):
        """`is_active_session` should work as expected."""
        await self.runtime.start()
        session_id = self.runtime.create_session(
            client=MockSessionClient(), user_info=MagicMock()
        )
        self.assertTrue(self.runtime.is_active_session(session_id))
        self.assertFalse(self.runtime.is_active_session("not_a_session_id"))

        self.runtime.close_session(session_id)
        self.assertFalse(self.runtime.is_active_session(session_id))

    async def test_shutdown_appsessions_on_stop(self):
        """When the Runtime stops, it should shut down open AppSessions."""
        with self.patch_app_session():
            await self.runtime.start()

            # Create a few sessions
            app_sessions = []
            for _ in range(3):
                session_id = self.runtime.create_session(
                    MockSessionClient(), MagicMock()
                )
                app_session = self.runtime._get_session_info(session_id).session
                app_sessions.append(app_session)

            # Sanity check
            for app_session in app_sessions:
                app_session.shutdown.assert_not_called()

            # Stop the Runtime
            self.runtime.stop()
            await self.runtime.stopped

            # All sessions should be shut down
            self.assertEqual(RuntimeState.STOPPED, self.runtime.state)
            for app_session in app_sessions:
                app_session.shutdown.assert_called_once()

    async def test_handle_backmsg(self):
        """BackMsgs should be delivered to the appropriate AppSession."""
        with self.patch_app_session():
            await self.runtime.start()
            session_id = self.runtime.create_session(
                client=MockSessionClient(), user_info=MagicMock()
            )

            back_msg = MagicMock()
            self.runtime.handle_backmsg(session_id, back_msg)

            app_session = self.runtime._get_session_info(session_id).session
            app_session.handle_backmsg.assert_called_once_with(back_msg)

    async def test_handle_backmsg_invalid_session(self):
        """A BackMsg for an invalid session should get dropped without an error."""
        await self.runtime.start()
        self.runtime.handle_backmsg("not_a_session_id", MagicMock())

    async def test_handle_backmsg_deserialization_exception(self):
        """BackMsg deserialization Exceptions should be delivered to the
        appropriate AppSession.
        """
        with self.patch_app_session():
            await self.runtime.start()
            session_id = self.runtime.create_session(
                client=MockSessionClient(), user_info=MagicMock()
            )

            exception = MagicMock()
            self.runtime.handle_backmsg_deserialization_exception(session_id, exception)

            app_session = self.runtime._get_session_info(session_id).session
            app_session.handle_backmsg_exception.assert_called_once_with(exception)

    async def test_handle_backmsg_exception_invalid_session(self):
        """A BackMsg exception for an invalid session should get dropped without an
        error."""
        await self.runtime.start()
        self.runtime.handle_backmsg_deserialization_exception(
            "not_a_session_id", MagicMock()
        )

    async def test_create_session_after_stop(self):
        """After Runtime.stop is called, `create_session` is an error."""
        await self.runtime.start()
        self.runtime.stop()
        await self.tick_runtime_loop()

        with self.assertRaises(RuntimeStoppedError):
            self.runtime.create_session(MagicMock(), MagicMock())

    async def test_handle_backmsg_after_stop(self):
        """After Runtime.stop is called, `handle_backmsg` is an error."""
        await self.runtime.start()
        self.runtime.stop()
        await self.tick_runtime_loop()

        with self.assertRaises(RuntimeStoppedError):
            self.runtime.handle_backmsg("not_a_session_id", MagicMock())

    async def test_sets_is_running_with_streamlit_flag(self):
        """Runtime should set streamlit._is_running_with_streamlit when it
        starts.
        """
        # This will frequently be True from other tests
        streamlit._is_running_with_streamlit = False
        await self.runtime.start()
        self.assertTrue(streamlit._is_running_with_streamlit)

    async def test_handle_session_client_disconnected(self):
        """Runtime should gracefully handle `SessionClient.write_forward_msg`
        raising a `SessionClientDisconnectedError`.
        """
        await self.runtime.start()

        client = MagicMock(spec=SessionClient)
        session_id = self.runtime.create_session(client, MagicMock())

        # Send the client a message. All should be well.
        self.enqueue_forward_msg(session_id, create_dataframe_msg([1, 2, 3]))
        await self.tick_runtime_loop()

        client.write_forward_msg.assert_called_once()
        self.assertTrue(self.runtime.is_active_session(session_id))

        # Send another message - but this time the client will raise an error.
        raise_disconnected_error = MagicMock(side_effect=SessionClientDisconnectedError)
        client.write_forward_msg = raise_disconnected_error
        self.enqueue_forward_msg(session_id, create_dataframe_msg([1, 2, 3]))
        await self.tick_runtime_loop()

        # Assert that our error was raised, and that our session was disconnected.
        raise_disconnected_error.assert_called_once()
        self.assertFalse(self.runtime.is_active_session(session_id))

    async def test_forwardmsg_hashing(self):
        """Test that outgoing ForwardMsgs contain hashes."""
        await self.runtime.start()

        client = MockSessionClient()
        session_id = self.runtime.create_session(client=client, user_info=MagicMock())

        # Create a message and ensure its hash is unset; we're testing
        # that _send_message adds the hash before it goes out.
        msg = create_dataframe_msg([1, 2, 3])
        msg.ClearField("hash")
        self.enqueue_forward_msg(session_id, msg)
        await self.tick_runtime_loop()

        received = client.forward_msgs.pop()
        self.assertEqual(populate_hash_if_needed(msg), received.hash)

    async def test_forwardmsg_cacheable_flag(self):
        """Test that the metadata.cacheable flag is set properly on outgoing
        ForwardMsgs."""
        await self.runtime.start()

        client = MockSessionClient()
        session_id = self.runtime.create_session(client=client, user_info=MagicMock())

        with patch_config_options({"global.minCachedMessageSize": 0}):
            cacheable_msg = create_dataframe_msg([1, 2, 3])
            self.enqueue_forward_msg(session_id, cacheable_msg)
            await self.tick_runtime_loop()

            received = client.forward_msgs.pop()
            self.assertTrue(cacheable_msg.metadata.cacheable)
            self.assertTrue(received.metadata.cacheable)

        with patch_config_options({"global.minCachedMessageSize": 1000}):
            cacheable_msg = create_dataframe_msg([4, 5, 6])
            self.enqueue_forward_msg(session_id, cacheable_msg)
            await self.tick_runtime_loop()

            received = client.forward_msgs.pop()
            self.assertFalse(cacheable_msg.metadata.cacheable)
            self.assertFalse(received.metadata.cacheable)

    async def test_duplicate_forwardmsg_caching(self):
        """Test that duplicate ForwardMsgs are sent only once."""
        with patch_config_options({"global.minCachedMessageSize": 0}):
            await self.runtime.start()

            client = MockSessionClient()
            session_id = self.runtime.create_session(
                client=client, user_info=MagicMock()
            )

            msg1 = create_dataframe_msg([1, 2, 3], 1)

            # Send the message, and read it back. It will not have been cached.
            self.enqueue_forward_msg(session_id, msg1)
            await self.tick_runtime_loop()

            uncached = client.forward_msgs.pop()
            self.assertEqual("delta", uncached.WhichOneof("type"))

            # Send an equivalent message. This time, it should be cached,
            # and a "hash_reference" message should be received instead.
            msg2 = create_dataframe_msg([1, 2, 3], 123)
            self.enqueue_forward_msg(session_id, msg2)
            await self.tick_runtime_loop()

            cached = client.forward_msgs.pop()
            self.assertEqual("ref_hash", cached.WhichOneof("type"))
            # We should have the *hash* of msg1 and msg2:
            self.assertEqual(msg1.hash, cached.ref_hash)
            self.assertEqual(msg2.hash, cached.ref_hash)
            # And the same *metadata* as msg2:
            self.assertEqual(msg2.metadata, cached.metadata)

    async def test_forwardmsg_cache_clearing(self):
        """Test that the ForwardMsgCache gets properly cleared when scripts
        finish running.
        """
        with patch_config_options(
            {"global.minCachedMessageSize": 0, "global.maxCachedMessageAge": 1}
        ):
            await self.runtime.start()

            client = MockSessionClient()
            session_id = self.runtime.create_session(
                client=client, user_info=MagicMock()
            )

            data_msg = create_dataframe_msg([1, 2, 3])

            async def finish_script(success: bool) -> None:
                status = (
                    ForwardMsg.FINISHED_SUCCESSFULLY
                    if success
                    else ForwardMsg.FINISHED_WITH_COMPILE_ERROR
                )
                finish_msg = create_script_finished_message(status)
                self.enqueue_forward_msg(session_id, finish_msg)
                await self.tick_runtime_loop()

            def is_data_msg_cached() -> bool:
                return (
                    self.runtime._message_cache.get_message(data_msg.hash) is not None
                )

            async def send_data_msg() -> None:
                self.enqueue_forward_msg(session_id, data_msg)
                await self.tick_runtime_loop()

            # Send a cacheable message. It should be cached.
            await send_data_msg()
            self.assertTrue(is_data_msg_cached())

            # End the script with a compile error. Nothing should change;
            # compile errors don't increase the age of items in the cache.
            await finish_script(False)
            self.assertTrue(is_data_msg_cached())

            # End the script successfully. Nothing should change, because
            # the age of the cached message is now 1.
            await finish_script(True)
            self.assertTrue(is_data_msg_cached())

            # Send the message again. This should reset its age to 0 in the
            # cache, so it won't be evicted when the script next finishes.
            await send_data_msg()
            self.assertTrue(is_data_msg_cached())

            # Finish the script. The cached message age is now 1.
            await finish_script(True)
            self.assertTrue(is_data_msg_cached())

            # Finish again. The cached message age will be 2, and so it
            # should be evicted from the cache.
            await finish_script(True)
            self.assertFalse(is_data_msg_cached())

    async def test_orphaned_upload_file_deletion(self):
        """An uploaded file with no associated AppSession should be
        deleted.
        """
        await self.runtime.start()

        client = MockSessionClient()
        session_id = self.runtime.create_session(client=client, user_info=MagicMock())

        file = UploadedFileRec(0, "file.txt", "type", b"123")

        # Upload a file for our connected session.
        added_file = self.runtime._uploaded_file_mgr.add_file(
            session_id=session_id,
            widget_id="widget_id",
            file=UploadedFileRec(0, "file.txt", "type", b"123"),
        )

        # The file should exist.
        self.assertEqual(
            self.runtime._uploaded_file_mgr.get_all_files(session_id, "widget_id"),
            [added_file],
        )

        # Disconnect the session. The file should be deleted.
        self.runtime.close_session(session_id)
        self.assertEqual(
            self.runtime._uploaded_file_mgr.get_all_files(session_id, "widget_id"),
            [],
        )

        # Upload a file for a session that doesn't exist.
        self.runtime._uploaded_file_mgr.add_file(
            session_id="no_such_session", widget_id="widget_id", file=file
        )

        # The file should be immediately deleted.
        self.assertEqual(
            self.runtime._uploaded_file_mgr.get_all_files(
                "no_such_session", "widget_id"
            ),
            [],
        )

    async def test_get_async_objs(self):
        """Runtime._get_async_objs() will raise an error if called before the
        Runtime is started, and will return the Runtime's AsyncObjects instance otherwise.
        """
        with self.assertRaises(RuntimeError):
            # Runtime hasn't started yet: error!
            _ = self.runtime._get_async_objs()

        # Runtime has started: no error
        await self.runtime.start()
        self.assertIsInstance(self.runtime._get_async_objs(), AsyncObjects)


@patch("streamlit.source_util._cached_pages", new=None)
class ScriptCheckTest(RuntimeTestCase):
    """Tests for Runtime.does_script_run_without_error"""

    def setUp(self) -> None:
        self._home = tempfile.mkdtemp()
        self._old_home = os.environ["HOME"]
        os.environ["HOME"] = self._home

        self._fd, self._path = tempfile.mkstemp()

        super().setUp()

    async def asyncSetUp(self):
        # We don't call super().asyncSetUp() here. (Our superclass creates
        # its own Runtime instance with a mock script_path, but we want
        # to specify a non-mocked path.)
        config = RuntimeConfig(
            script_path=self._path,
            command_line="mock command line",
            media_file_storage=MemoryMediaFileStorage("/mock/media"),
        )
        self.runtime = Runtime(config)
        await self.runtime.start()

    def tearDown(self) -> None:
        if event_based_path_watcher._MultiPathWatcher._singleton is not None:
            event_based_path_watcher._MultiPathWatcher.get_singleton().close()
            event_based_path_watcher._MultiPathWatcher._singleton = None

        os.environ["HOME"] = self._old_home
        os.remove(self._path)
        shutil.rmtree(self._home)

        super().tearDown()

    @pytest.mark.slow
    async def test_invalid_script(self):
        script = """
import streamlit as st
st.not_a_function('test')
"""

        await self._check_script_loading(script, False, "error")

    @pytest.mark.slow
    async def test_valid_script(self):
        script = """
import streamlit as st
st.write('test')
"""

        await self._check_script_loading(script, True, "ok")

    @pytest.mark.slow
    async def test_timeout_script(self):
        script = """
import time
time.sleep(5)
"""

        with patch("streamlit.runtime.runtime.SCRIPT_RUN_CHECK_TIMEOUT", new=0.1):
            await self._check_script_loading(script, False, "timeout")

    async def _check_script_loading(
        self, script: str, expected_loads: bool, expected_msg: str
    ) -> None:
        with os.fdopen(self._fd, "w") as tmp:
            tmp.write(script)

        ok, msg = await self.runtime.does_script_run_without_error()
        event_based_path_watcher._MultiPathWatcher.get_singleton().close()
        event_based_path_watcher._MultiPathWatcher._singleton = None
        self.assertEqual(expected_loads, ok)
        self.assertEqual(expected_msg, msg)
