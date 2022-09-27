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

"""DeltaGenerator Unittest."""

import functools
import json

from parameterized import parameterized

import streamlit as st
from streamlit.delta_generator import DeltaGenerator
from streamlit.cursor import LockedCursor, make_delta_path
from streamlit.errors import DuplicateWidgetID
from streamlit.errors import StreamlitAPIException
from streamlit.proto.Element_pb2 import Element
from streamlit.proto.TextArea_pb2 import TextArea
from streamlit.proto.TextInput_pb2 import TextInput
from streamlit.proto.Empty_pb2 import Empty as EmptyProto
from streamlit.proto.RootContainer_pb2 import RootContainer
from streamlit.proto.Text_pb2 import Text as TextProto
from streamlit.runtime.state.widgets import _build_duplicate_widget_message
import streamlit.runtime.state.widgets as w
from tests import testutil


def identity(x):
    return x


register_widget = functools.partial(
    w.register_widget, deserializer=lambda x, s: x, serializer=identity
)


class DeltaGeneratorTest(testutil.DeltaGeneratorTestCase):
    """Test streamlit.delta_generator methods."""

    def test_nonexistent_method(self):
        with self.assertRaises(Exception) as ctx:
            st.sidebar.non_existing()

        self.assertEqual(
            str(ctx.exception), "`non_existing()` is not a valid Streamlit command."
        )

    def test_sidebar_nonexistent_method(self):
        with self.assertRaises(Exception) as ctx:
            st.sidebar.echo()

        self.assertEqual(
            str(ctx.exception),
            "Method `echo()` does not exist for `st.sidebar`. "
            "Did you mean `st.echo()`?",
        )

    def set_widget_requires_args(self):
        st.text_input()
        c = self.get_delta_from_queue().new_element.exception
        self.assertEqual(c.type, "TypeError")

    def test_duplicate_widget_id_error(self):
        """Multiple widgets with the same generated key should report an error."""
        widgets = {
            "button": lambda key=None: st.button("", key=key),
            "checkbox": lambda key=None: st.checkbox("", key=key),
            "multiselect": lambda key=None: st.multiselect("", options=[1, 2], key=key),
            "radio": lambda key=None: st.radio("", options=[1, 2], key=key),
            "selectbox": lambda key=None: st.selectbox("", options=[1, 2], key=key),
            "slider": lambda key=None: st.slider("", key=key),
            "text_area": lambda key=None: st.text_area("", key=key),
            "text_input": lambda key=None: st.text_input("", key=key),
            "time_input": lambda key=None: st.time_input("", key=key),
            "date_input": lambda key=None: st.date_input("", key=key),
            "number_input": lambda key=None: st.number_input("", key=key),
        }

        for widget_type, create_widget in widgets.items():
            create_widget()
            with self.assertRaises(DuplicateWidgetID) as ctx:
                # Test creating a widget with a duplicate auto-generated key
                # raises an exception.
                create_widget()
            self.assertEqual(
                _build_duplicate_widget_message(
                    widget_func_name=widget_type, user_key=None
                ),
                str(ctx.exception),
            )

        for widget_type, create_widget in widgets.items():
            # widgets with keys are distinct from the unkeyed ones created above
            create_widget(widget_type)
            with self.assertRaises(DuplicateWidgetID) as ctx:
                # Test creating a widget with a duplicate auto-generated key
                # raises an exception.
                create_widget(widget_type)
            self.assertEqual(
                _build_duplicate_widget_message(
                    widget_func_name=widget_type, user_key=widget_type
                ),
                str(ctx.exception),
            )

    def test_duplicate_widget_id_error_when_user_key_specified(self):
        """Multiple widgets with the different generated key, but same user specified
        key should report an error.
        """

        widgets = {
            "button": lambda key=None, label="": st.button(label=label, key=key),
            "checkbox": lambda key=None, label="": st.checkbox(label=label, key=key),
            "multiselect": lambda key=None, label="": st.multiselect(
                label=label, options=[1, 2], key=key
            ),
            "radio": lambda key=None, label="": st.radio(
                label=label, options=[1, 2], key=key
            ),
            "selectbox": lambda key=None, label="": st.selectbox(
                label=label, options=[1, 2], key=key
            ),
            "slider": lambda key=None, label="": st.slider(label=label, key=key),
            "text_area": lambda key=None, label="": st.text_area(label=label, key=key),
            "text_input": lambda key=None, label="": st.text_input(
                label=label, key=key
            ),
            "time_input": lambda key=None, label="": st.time_input(
                label=label, key=key
            ),
            "date_input": lambda key=None, label="": st.date_input(
                label=label, key=key
            ),
            "number_input": lambda key=None, label="": st.number_input(
                label=label, key=key
            ),
        }

        for widget_type, create_widget in widgets.items():
            user_key = widget_type
            create_widget(label="LABEL_A", key=user_key)
            with self.assertRaises(DuplicateWidgetID) as ctx:
                # We specify different labels for widgets, so auto-generated keys
                # (widget_ids) will be different.
                # Test creating a widget with a different auto-generated key but same
                # user specified key raises an exception.
                create_widget(label="LABEL_B", key=user_key)
            self.assertEqual(
                _build_duplicate_widget_message(
                    widget_func_name=widget_type, user_key=user_key
                ),
                str(ctx.exception),
            )


class DeltaGeneratorClassTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Class."""

    def test_constructor(self):
        """Test default DeltaGenerator()."""
        dg = DeltaGenerator()
        self.assertFalse(dg._cursor.is_locked)
        self.assertEqual(dg._cursor.index, 0)

    def test_constructor_with_id(self):
        """Test DeltaGenerator() with an id."""
        cursor = LockedCursor(root_container=RootContainer.MAIN, index=1234)
        dg = DeltaGenerator(root_container=RootContainer.MAIN, cursor=cursor)
        self.assertTrue(dg._cursor.is_locked)
        self.assertEqual(dg._cursor.index, 1234)

    def test_enqueue_null(self):
        # Test "Null" Delta generators
        dg = DeltaGenerator(root_container=None)
        new_dg = dg._enqueue("empty", EmptyProto())
        self.assertEqual(dg, new_dg)

    @parameterized.expand([(RootContainer.MAIN,), (RootContainer.SIDEBAR,)])
    def test_enqueue(self, container):
        dg = DeltaGenerator(root_container=container)
        self.assertEqual(0, dg._cursor.index)
        self.assertEqual(container, dg._root_container)

        test_data = "some test data"
        text_proto = TextProto()
        text_proto.body = test_data
        new_dg = dg._enqueue("text", text_proto)

        self.assertNotEqual(dg, new_dg)
        self.assertEqual(1, dg._cursor.index)
        self.assertEqual(container, new_dg._root_container)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(element.text.body, test_data)

    def test_enqueue_same_id(self):
        cursor = LockedCursor(root_container=RootContainer.MAIN, index=123)
        dg = DeltaGenerator(root_container=RootContainer.MAIN, cursor=cursor)
        self.assertEqual(123, dg._cursor.index)

        test_data = "some test data"
        text_proto = TextProto()
        text_proto.body = test_data
        new_dg = dg._enqueue("text", text_proto)

        self.assertEqual(dg._cursor, new_dg._cursor)

        msg = self.get_message_from_queue()
        # The last element in delta_path is the delta's index in its container.
        self.assertEqual(
            make_delta_path(RootContainer.MAIN, (), 123), msg.metadata.delta_path
        )
        self.assertEqual(msg.delta.new_element.text.body, test_data)


class DeltaGeneratorContainerTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Container."""

    def test_container(self):
        container = st.container()

        self.assertIsInstance(container, DeltaGenerator)
        self.assertFalse(container._cursor.is_locked)

    def test_container_paths(self):
        level3 = st.container().container().container()
        level3.markdown("hi")
        level3.markdown("bye")

        msg = self.get_message_from_queue()
        self.assertEqual(
            make_delta_path(RootContainer.MAIN, (0, 0, 0), 1), msg.metadata.delta_path
        )


class DeltaGeneratorColumnsTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Columns."""

    def test_equal_columns(self):
        for column in st.columns(4):
            self.assertIsInstance(column, DeltaGenerator)
            self.assertFalse(column._cursor.is_locked)

    def test_variable_columns(self):
        weights = [3, 1, 4, 1, 5, 9]
        sum_weights = sum(weights)
        st.columns(weights)

        for i, w in enumerate(weights):
            # Pull the delta from the back of the queue, using negative index
            delta = self.get_delta_from_queue(i - len(weights))
            self.assertEqual(delta.add_block.column.weight, w / sum_weights)

    def test_bad_columns_negative_int(self):
        with self.assertRaises(StreamlitAPIException):
            st.columns(-1337)

    def test_bad_columns_single_float(self):
        with self.assertRaises(TypeError):
            st.columns(6.28)

    def test_bad_columns_list_negative_value(self):
        with self.assertRaises(StreamlitAPIException):
            st.columns([5, 6, -1.2])

    def test_bad_columns_list_int_zero_value(self):
        with self.assertRaises(StreamlitAPIException):
            st.columns([5, 0, 1])

    def test_bad_columns_list_float_zero_value(self):
        with self.assertRaises(StreamlitAPIException):
            st.columns([5.0, 0.0, 1.0])

    def test_nested_columns(self):
        level1, _ = st.columns(2)
        with self.assertRaises(StreamlitAPIException):
            level2, _ = level1.columns(2)


class DeltaGeneratorExpanderTest(testutil.DeltaGeneratorTestCase):
    def test_nested_expanders(self):
        level1 = st.expander("level 1")
        with self.assertRaises(StreamlitAPIException):
            level2 = level1.expander("level 2")


class DeltaGeneratorWithTest(testutil.DeltaGeneratorTestCase):
    """Test the `with DG` feature"""

    def test_with(self):
        # Same as test_container_paths, but using `with` syntax
        level3 = st.container().container().container()
        with level3:
            st.markdown("hi")
            st.markdown("bye")

        msg = self.get_message_from_queue()
        self.assertEqual(
            make_delta_path(RootContainer.MAIN, (0, 0, 0), 1), msg.metadata.delta_path
        )

        # Now we're out of the `with` block, commands should use the main dg
        st.markdown("outside")

        msg = self.get_message_from_queue()
        self.assertEqual(
            make_delta_path(RootContainer.MAIN, (), 1), msg.metadata.delta_path
        )

    def test_nested_with(self):
        with st.container():
            with st.container():
                st.markdown("Level 2 with")
                msg = self.get_message_from_queue()
                self.assertEqual(
                    make_delta_path(RootContainer.MAIN, (0, 0), 0),
                    msg.metadata.delta_path,
                )

            st.markdown("Level 1 with")
            msg = self.get_message_from_queue()
            self.assertEqual(
                make_delta_path(RootContainer.MAIN, (0,), 1),
                msg.metadata.delta_path,
            )


class DeltaGeneratorWriteTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Text, Alert, Json, and Markdown Classes."""

    def test_json_list(self):
        """Test Text.JSON list."""
        json_data = [5, 6, 7, 8]

        st.json(json_data)

        json_string = json.dumps(json_data)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(json_string, element.json.body)

    def test_json_tuple(self):
        """Test Text.JSON tuple."""
        json_data = (5, 6, 7, 8)

        st.json(json_data)

        json_string = json.dumps(json_data)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(json_string, element.json.body)

    def test_json_object(self):
        """Test Text.JSON object."""
        json_data = {"key": "value"}

        # Testing python object
        st.json(json_data)

        json_string = json.dumps(json_data)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(json_string, element.json.body)
        self.assertEqual(True, element.json.expanded)

    def test_json_string(self):
        """Test Text.JSON string."""
        json_string = '{"key": "value"}'

        # Testing JSON string
        st.json(json_string)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(json_string, element.json.body)

    def test_json_unserializable(self):
        """Test Text.JSON with unserializable object."""
        obj = json  # Modules aren't serializable.

        # Testing unserializable object.
        st.json(obj)

        element = self.get_delta_from_queue().new_element

        # validate a substring since repr for a module may contain an installation-specific path
        self.assertTrue(element.json.body.startswith("\"<module 'json'"))

    def test_json_not_expanded_arg(self):
        """Test st.json expanded arg."""
        json_data = {"key": "value"}

        # Testing python object
        st.json(json_data, expanded=False)

        json_string = json.dumps(json_data)

        element = self.get_delta_from_queue().new_element
        self.assertEqual(json_string, element.json.body)
        self.assertEqual(False, element.json.expanded)

    def test_json_not_mutates_data_containing_sets(self):
        """Test st.json do not mutate data containing sets,
        pass a dict-containing-a-set to st.json; ensure that it's not mutated
        """
        json_data = {"some_set": {"a", "b"}}
        self.assertIsInstance(json_data["some_set"], set)

        st.json(json_data)
        self.assertIsInstance(json_data["some_set"], set)

    def test_st_json_set_is_serialized_as_list(self):
        """Test st.json serializes set as list"""
        json_data = {"a", "b", "c", "d"}
        st.json(json_data)
        element = self.get_delta_from_queue().new_element
        parsed_element = json.loads(element.json.body)
        self.assertIsInstance(parsed_element, list)
        for el in json_data:
            self.assertIn(el, parsed_element)

    def test_st_json_serializes_sets_inside_iterables_as_lists(self):
        """Test st.json serializes sets inside iterables as lists"""
        json_data = {"some_set": {"a", "b"}}
        st.json(json_data)
        element = self.get_delta_from_queue().new_element
        parsed_element = json.loads(element.json.body)
        set_as_list = parsed_element.get("some_set")
        self.assertIsInstance(set_as_list, list)
        self.assertSetEqual(json_data["some_set"], set(set_as_list))

    def test_st_json_generator_is_serialized_as_string(self):
        """Test st.json serializes generator as string"""
        json_data = (c for c in "foo")
        st.json(json_data)
        element = self.get_delta_from_queue().new_element
        parsed_element = json.loads(element.json.body)
        self.assertIsInstance(parsed_element, str)
        self.assertIn("generator", parsed_element)

    def test_markdown(self):
        """Test Markdown element."""
        test_string = "    data         "

        st.markdown(test_string)

        element = self.get_delta_from_queue().new_element
        self.assertEqual("data", element.markdown.body)

        test_string = "    <a#data>data</a>   "
        st.markdown(test_string)
        element = self.get_delta_from_queue().new_element

        assert element.markdown.body.startswith("<a#data>")

    def test_code(self):
        """Test st.code()"""
        code = "print('Hello, %s!' % 'Streamlit')"
        expected_body = "```python\n%s\n```" % code

        st.code(code, language="python")
        element = self.get_delta_from_queue().new_element

        # st.code() creates a MARKDOWN text object that wraps
        # the body inside a codeblock declaration
        self.assertEqual(element.markdown.body, expected_body)

    def test_empty(self):
        """Test Empty."""
        st.empty()

        element = self.get_delta_from_queue().new_element
        self.assertEqual(element.empty, EmptyProto())


class DeltaGeneratorProgressTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Progress."""

    def test_progress_int(self):
        """Test Progress with int values."""
        values = [0, 42, 100]
        for value in values:
            st.progress(value)

            element = self.get_delta_from_queue().new_element
            self.assertEqual(value, element.progress.value)

    def test_progress_float(self):
        """Test Progress with float values."""
        values = [0.0, 0.42, 1.0]
        for value in values:
            st.progress(value)

            element = self.get_delta_from_queue().new_element
            self.assertEqual(int(value * 100), element.progress.value)

    def test_progress_bad_values(self):
        """Test Progress with bad values."""
        values = [-1, 101, -0.01, 1.01]
        for value in values:
            with self.assertRaises(StreamlitAPIException):
                st.progress(value)

        with self.assertRaises(StreamlitAPIException):
            st.progress("some string")


class AutogeneratedWidgetIdTests(testutil.DeltaGeneratorTestCase):
    def test_ids_are_equal_when_proto_is_equal(self):
        text_input1 = TextInput()
        text_input1.label = "Label #1"
        text_input1.default = "Value #1"

        text_input2 = TextInput()
        text_input2.label = "Label #1"
        text_input2.default = "Value #1"

        element1 = Element()
        element1.text_input.CopyFrom(text_input1)

        element2 = Element()
        element2.text_input.CopyFrom(text_input2)

        register_widget("text_input", element1.text_input, ctx=self.new_script_run_ctx)

        with self.assertRaises(DuplicateWidgetID):
            register_widget(
                "text_input", element2.text_input, ctx=self.new_script_run_ctx
            )

    def test_ids_are_diff_when_labels_are_diff(self):
        text_input1 = TextInput()
        text_input1.label = "Label #1"
        text_input1.default = "Value #1"

        text_input2 = TextInput()
        text_input2.label = "Label #2"
        text_input2.default = "Value #1"

        element1 = Element()
        element1.text_input.CopyFrom(text_input1)

        element2 = Element()
        element2.text_input.CopyFrom(text_input2)

        register_widget("text_input", element1.text_input, ctx=self.new_script_run_ctx)
        register_widget("text_input", element2.text_input, ctx=self.new_script_run_ctx)

        self.assertNotEqual(element1.text_input.id, element2.text_input.id)

    def test_ids_are_diff_when_types_are_diff(self):
        text_input1 = TextInput()
        text_input1.label = "Label #1"
        text_input1.default = "Value #1"

        text_area2 = TextArea()
        text_area2.label = "Label #1"
        text_area2.default = "Value #1"

        element1 = Element()
        element1.text_input.CopyFrom(text_input1)

        element2 = Element()
        element2.text_area.CopyFrom(text_area2)

        register_widget("text_input", element1.text_input, ctx=self.new_script_run_ctx)
        register_widget("text_input", element2.text_input, ctx=self.new_script_run_ctx)

        self.assertNotEqual(element1.text_input.id, element2.text_area.id)


class KeyWidgetIdTests(testutil.DeltaGeneratorTestCase):
    def test_ids_are_diff_when_keys_are_diff(self):
        text_input1 = TextInput()
        text_input1.label = "Label #1"
        text_input1.default = "Value #1"

        text_input2 = TextInput()
        text_input2.label = "Label #1"
        text_input2.default = "Value #1"

        element1 = Element()
        element1.text_input.CopyFrom(text_input1)

        element2 = Element()
        element2.text_input.CopyFrom(text_input2)

        register_widget(
            "text_input",
            element1.text_input,
            user_key="some_key1",
            ctx=self.new_script_run_ctx,
        )
        register_widget(
            "text_input",
            element2.text_input,
            user_key="some_key2",
            ctx=self.new_script_run_ctx,
        )

        self.assertNotEqual(element1.text_input.id, element2.text_input.id)


class DeltaGeneratorImageTest(testutil.DeltaGeneratorTestCase):
    """Test DeltaGenerator Images"""

    def test_image_from_url(self):
        """Tests dg.image with single and multiple image URLs"""

        url = "https://streamlit.io/an_image.png"
        caption = "ahoy!"

        # single URL
        st.image(url, caption=caption, width=200)
        element = self.get_delta_from_queue().new_element
        self.assertEqual(element.imgs.width, 200)
        self.assertEqual(len(element.imgs.imgs), 1)
        self.assertEqual(element.imgs.imgs[0].url, url)
        self.assertEqual(element.imgs.imgs[0].caption, caption)

        # multiple URLs
        st.image([url] * 5, caption=[caption] * 5, width=200)
        element = self.get_delta_from_queue().new_element
        self.assertEqual(len(element.imgs.imgs), 5)
        self.assertEqual(element.imgs.imgs[4].url, url)
        self.assertEqual(element.imgs.imgs[4].caption, caption)

    def test_unequal_images_and_captions_error(self):
        """Tests that the number of images and captions must match, or
        an exception is generated"""

        url = "https://streamlit.io/an_image.png"
        caption = "ahoy!"

        with self.assertRaises(Exception) as ctx:
            st.image([url] * 5, caption=[caption] * 2)
        self.assertTrue("Cannot pair 2 captions with 5 images." in str(ctx.exception))
