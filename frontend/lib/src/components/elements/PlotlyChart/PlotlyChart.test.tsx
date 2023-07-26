/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"
import { mount } from "@streamlit/lib/src/test_util"
import Plot from "react-plotly.js"

import ThemeProvider from "@streamlit/lib/src/components/core/ThemeProvider"
import { PlotlyChart as PlotlyChartProto } from "@streamlit/lib/src/proto"
import { mockTheme } from "@streamlit/lib/src/mocks/mockTheme"
import mock from "./mock"
import { DEFAULT_HEIGHT, PlotlyChartProps } from "./PlotlyChart"

jest.mock("react-plotly.js", () => jest.fn(() => null))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PlotlyChart } = require("./PlotlyChart")

const getProps = (
  elementProps: Partial<PlotlyChartProto> = {}
): PlotlyChartProps => ({
  element: PlotlyChartProto.create({
    ...mock,
    ...elementProps,
  }),
  width: 0,
  height: 0,
})

function testEnterAndExitFullscreen(useContainerWidth: boolean): void {
  const nonFullScreenProps = {
    ...getProps({
      useContainerWidth,
    }),
    height: undefined,
  }
  const wrapper = mount(<PlotlyChart {...nonFullScreenProps} />)

  const initialHeight = wrapper.find(Plot).props().layout.height
  const initialWidth = wrapper.find(Plot).props().layout.width

  const fullScreenProps = {
    ...getProps(),
    height: 400,
    width: 400,
  }

  wrapper.setProps(fullScreenProps)
  wrapper.update()

  wrapper.setProps(nonFullScreenProps)
  wrapper.update()

  expect(wrapper.find(Plot).props().layout.width).toEqual(initialWidth)
  expect(wrapper.find(Plot).props().layout.height).toEqual(initialHeight)

  // an explicit value because useContainerWidth is passed
  if (useContainerWidth)
    expect(wrapper.find(Plot).props().layout.width).not.toBeUndefined()
  else expect(wrapper.find(Plot).props().layout.width).toBeUndefined()
  // undefined because plotly will render its own default height
  expect(wrapper.find(Plot).props().layout.height).toBeUndefined()
}

describe("PlotlyChart Element", () => {
  it("renders without crashing", () => {
    const props = getProps()
    const wrapper = mount(<PlotlyChart {...props} />)

    expect(wrapper.find(Plot).length).toBe(1)
  })

  describe("Dimensions", () => {
    it("fullscreen", () => {
      const props = {
        ...getProps(),
        height: 400,
        width: 400,
      }
      const wrapper = mount(<PlotlyChart {...props} />)

      expect(wrapper.find(Plot).props().layout.width).toBe(400)
      expect(wrapper.find(Plot).props().layout.height).toBe(400)
    })

    it("useContainerWidth true", () => {
      const props = {
        ...getProps({
          useContainerWidth: true,
        }),
      }
      const wrapper = mount(<PlotlyChart {...props} />)

      // an explicit value because useContainerWidth is passed
      expect(wrapper.find(Plot).props().layout.width).not.toBeUndefined()
      expect(wrapper.find(Plot).props().layout.height).toBeUndefined()
    })

    it("useContainerWidth false", () => {
      const props = {
        ...getProps({
          useContainerWidth: false,
        }),
      }
      const wrapper = mount(<PlotlyChart {...props} />)

      expect(wrapper.find(Plot).props().layout.width).toBeUndefined()
      expect(wrapper.find(Plot).props().layout.height).toBeUndefined()
    })

    // eslint-disable-next-line jest/expect-expect -- underlying testEnterAndExitFullscreen function has expect statements
    it("renders properly when entering fullscreen and out of fullscreen and useContainerWidth is false", () => {
      testEnterAndExitFullscreen(false)
    })

    // eslint-disable-next-line jest/expect-expect -- underlying testEnterAndExitFullscreen function has expect statements
    it("renders properly when entering fullscreen and out of fullscreen and useContainerWidth is true", () => {
      testEnterAndExitFullscreen(true)
    })
  })

  describe("Render iframe", () => {
    const props = getProps({
      chart: "url",
      url: "http://url.test",
      figure: undefined,
    })

    it("should render an iframe", () => {
      const wrapper = mount(<PlotlyChart {...props} />)

      expect(wrapper.find("iframe").length).toBe(1)
      expect(wrapper.find("iframe").props()).toMatchSnapshot()
      // @ts-expect-error
      expect(wrapper.find("iframe").prop("style").height).toBe(DEFAULT_HEIGHT)
    })

    it("should render with an specific height", () => {
      const propsWithHeight = {
        ...props,
        height: 400,
        width: 500,
      }
      const wrapper = mount(<PlotlyChart {...propsWithHeight} />)

      // @ts-expect-error
      expect(wrapper.find("iframe").prop("style").height).toBe(400)
    })
  })

  describe("Theming", () => {
    it("pulls default config values from theme", () => {
      const props = getProps()
      const wrapper = mount(
        <ThemeProvider
          theme={mockTheme.emotion}
          baseuiTheme={mockTheme.basewebTheme}
        >
          <PlotlyChart {...props} />
        </ThemeProvider>
      )

      const { layout } = wrapper.find(Plot).first().props()
      expect(layout.paper_bgcolor).toBe(mockTheme.emotion.colors.bgColor)
      expect(layout.font?.color).toBe(mockTheme.emotion.colors.bodyText)
    })

    it("has user specified config take priority", () => {
      const props = getProps()

      const spec = JSON.parse(props.element.figure?.spec || "") || {}
      spec.layout = {
        ...spec?.layout,
        paper_bgcolor: "orange",
      }

      props.element.figure = props.element.figure || {}
      props.element.figure.spec = JSON.stringify(spec)

      const wrapper = mount(
        <ThemeProvider
          theme={mockTheme.emotion}
          baseuiTheme={mockTheme.basewebTheme}
        >
          <PlotlyChart {...props} />
        </ThemeProvider>
      )

      const { layout } = wrapper.find(Plot).first().props()
      expect(layout.paper_bgcolor).toBe("orange")
      // Verify that things not overwritten by the user still fall back to the
      // theme default.
      expect(layout.font?.color).toBe(mockTheme.emotion.colors.bodyText)
    })
  })
})
