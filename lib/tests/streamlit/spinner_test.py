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

import time

from streamlit.elements.spinner import spinner
from tests.delta_generator_test_case import DeltaGeneratorTestCase


class SpinnerTest(DeltaGeneratorTestCase):
    def test_spinner(self):
        """Test st.spinner."""
        with spinner("some text"):
            # Without the timeout, the spinner is sometimes not available
            time.sleep(0.2)
            el = self.get_delta_from_queue().new_element
            self.assertEqual(el.spinner.text, "some text")
        # Check that the element gets reset to an empty container block:
        last_delta = self.get_delta_from_queue()
        self.assertTrue(last_delta.HasField("add_block"))
        # The block should have `allow_empty` set to false,
        # which means that it will be ignored on the frontend in case
        # it the container is empty. This is the desired behavior
        # for spinner
        self.assertFalse(last_delta.add_block.allow_empty)
