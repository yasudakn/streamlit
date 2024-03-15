# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
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
import pytest

from streamlit.testing.v1 import AppTest


def test_smoke():
    def script():
        import streamlit as st

        st.radio("radio", options=["a", "b", "c"], key="r")
        st.radio("default index", options=["a", "b", "c"], index=2)

    at = AppTest.from_function(script).run()
    assert at.radio
    assert at.radio[0].value == "a"
    assert at.radio(key="r").value == "a"
    assert at.radio.values == ["a", "c"]

    r = at.radio[0].set_value("b")
    assert r.index == 1
    assert r.value == "b"
    at = r.run()
    assert at.radio[0].value == "b"
    assert at.radio.values == ["b", "c"]


def test_from_file():
    script = AppTest.from_file("../test_data/widgets_script.py")
    script.run()


def test_get_query_params():
    def script():
        import streamlit as st

        st.write(st.experimental_get_query_params())

    at = AppTest.from_function(script).run()
    assert at.json[0].value == "{}"
    at.query_params["foo"] = 5
    at.query_params["bar"] = "baz"
    at.run()
    assert at.json[0].value == '{"foo": ["5"], "bar": ["baz"]}'


def test_set_query_params():
    def script():
        import streamlit as st

        st.experimental_set_query_params(foo="bar")

    at = AppTest.from_function(script).run()
    # parse.parse_qs puts everything in lists
    assert at.query_params["foo"] == ["bar"]


def test_secrets():
    def script():
        import streamlit as st

        st.write(st.secrets["foo"])

    at = AppTest.from_function(script)
    at.secrets["foo"] = "bar"
    at.run()
    assert at.markdown[0].value == "bar"
    assert at.secrets["foo"] == "bar"


def test_7636_regression():
    def repro():
        import streamlit as st

        st.container()

    at = AppTest.from_function(repro).run()

    repr(at)


def test_cached_widget_replay_rerun():
    def script():
        import streamlit as st

        @st.cache_data(experimental_allow_widgets=True, show_spinner=False)
        def foo(i):
            options = ["foo", "bar", "baz", "qux"]
            r = st.radio("radio", options, index=i)
            return r

        foo(1)

    at = AppTest.from_function(script).run()

    assert at.radio.len == 1
    at.run()
    assert at.radio.len == 1


def test_cached_widget_replay_interaction():
    def script():
        import streamlit as st

        @st.cache_data(experimental_allow_widgets=True, show_spinner=False)
        def foo(i):
            options = ["foo", "bar", "baz", "qux"]
            r = st.radio("radio", options, index=i)
            return r

        foo(1)

    at = AppTest.from_function(script).run()

    assert at.radio.len == 1
    assert at.radio[0].value == "bar"

    at.radio[0].set_value("qux").run()
    assert at.radio[0].value == "qux"


def test_widget_added_removed():
    """
    Test that the value of a widget persists, disappears, and resets
    appropriately, as the widget is added and removed from the script execution.
    """

    def script():
        import streamlit as st

        cb = st.radio("radio emulating a checkbox", options=["off", "on"], key="cb")
        if cb == "on":
            st.radio("radio", options=["a", "b", "c"], key="conditional")

    at = AppTest.from_function(script).run()
    assert len(at.radio) == 1
    with pytest.raises(KeyError):
        at.radio(key="conditional")

    at.radio(key="cb").set_value("on").run()
    assert len(at.radio) == 2
    assert at.radio(key="conditional").value == "a"

    at.radio(key="conditional").set_value("c").run()
    assert len(at.radio) == 2
    assert at.radio(key="conditional").value == "c"

    at.radio(key="cb").set_value("off").run()
    assert len(at.radio) == 1
    with pytest.raises(KeyError):
        at.radio(key="conditional")

    at.radio(key="cb").set_value("on").run()
    assert len(at.radio) == 2
    assert at.radio(key="conditional").value == "a"


def test_query_narrowing():
    def script():
        import streamlit as st

        st.text("1")
        with st.expander("open"):
            st.text("2")
            st.text("3")
        st.text("4")

    at = AppTest.from_function(script).run()
    assert at.text.len == 4
    # querying elements via a block only returns the elements in that block
    assert at.expander[0].text.len == 2


def test_out_of_order_blocks() -> None:
    # Regression test for #7711
    def script():
        import streamlit as st

        container = st.container()
        with container:
            st.markdown("BarFoo")

            def button_one_clicked(cont):
                cont.info("Hi!")
                cont.markdown("FooBar")

            st.button("one", on_click=button_one_clicked, args=[container])

    at = AppTest.from_function(script).run()

    at.button[0].click().run()

    assert at.markdown.len == 2
    assert at.info[0].value == "Hi!"
    assert at.markdown.values == ["FooBar", "BarFoo"]


def test_from_function_kwargs():
    def script(foo, baz):
        import streamlit as st

        st.text(foo)
        st.text(baz)
        return foo

    at = AppTest.from_function(script, args=("bar",), kwargs={"baz": "baz"}).run()
    assert at.text.values == ["bar", "baz"]


def test_trigger_recursion():
    # Regression test for #7768
    def code():
        import time

        import streamlit as st

        if st.button(label="Submit"):
            print("CLICKED!")
            time.sleep(1)
            st.rerun()

    at = AppTest.from_function(code).run()
    # The script run should finish instead of recurring and timing out
    at.button[0].click().run()


def test_switch_page():
    at = AppTest.from_file("test_data/main.py").run()
    assert at.text[0].value == "main page"

    at.switch_page("pages/page1.py").run()
    assert at.text[0].value == "page 1"

    with pytest.raises(ValueError) as e:
        # Pages must be relative to main script path
        at.switch_page("test_data/pages/page1.py")
        assert "relative to the main script path" in str(e.value)


def test_switch_page_widgets():
    at = AppTest.from_file("test_data/main.py").run()
    at.slider[0].set_value(5).run()
    assert at.slider[0].value == 5

    at.switch_page("pages/page1.py").run()
    assert not at.slider
    at.switch_page("main.py").run()
    assert at.slider[0].value == 0
