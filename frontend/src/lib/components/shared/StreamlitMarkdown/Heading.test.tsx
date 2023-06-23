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
import "@testing-library/jest-dom"
import { mount } from "src/lib/test_util"
import { Heading as HeadingProto } from "src/lib/proto"
import Heading, { HeadingProtoProps } from "./Heading"

import {
  InlineTooltipIcon,
  StyledLabelHelpWrapper,
} from "src/lib/components/shared/TooltipIcon"

const getHeadingProps = (
  elementProps: Partial<HeadingProto> = {}
): HeadingProtoProps => ({
  width: 5,
  element: HeadingProto.create({
    anchor: "some-anchor",
    tag: "h1",
    body: `hello world
             this is a new line`,
    ...elementProps,
  }),
})

describe("Heading", () => {
  it("renders properly after a new line", () => {
    const props = getHeadingProps()
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual("hello world")
    expect(wrapper.find("RenderedMarkdown").at(1).text()).toEqual(
      "this is a new line"
    )
  })

  it("renders properly without a new line", () => {
    const props = getHeadingProps({ body: "hello" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual("hello")
    expect(wrapper.find("StyledStreamlitMarkdown")).toHaveLength(1)
  })

  it("renders anchor link", () => {
    const props = getHeadingProps({ body: "hello" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("StyledLinkIcon")).toHaveLength(1)
  })

  it("does not renders anchor link when it is hidden", () => {
    const props = getHeadingProps({ body: "hello", hideAnchor: true })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("StyledLinkIcon")).toHaveLength(0)
  })

  it("renders properly with help text", () => {
    const props = getHeadingProps({ body: "hello", help: "help text" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual("hello")
    expect(wrapper.find("StyledStreamlitMarkdown")).toHaveLength(1)
    expect(wrapper.find(StyledLabelHelpWrapper).exists()).toBe(true)
    const inlineTooltipIcon = wrapper.find(InlineTooltipIcon)
    expect(inlineTooltipIcon.exists()).toBe(true)
    expect(inlineTooltipIcon.props().content).toBe("help text")
  })

  it("does not render ol block", () => {
    const props = getHeadingProps({ body: "1) hello" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual("1) hello")
    expect(wrapper.find("ol")).toHaveLength(0)
  })

  it("does not render ul block", () => {
    const props = getHeadingProps({ body: "* hello" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual("* hello")
    expect(wrapper.find("ul")).toHaveLength(0)
  })

  it("does not render blockquote with >", () => {
    const props = getHeadingProps({ body: ">hello" })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual(">hello")
    expect(wrapper.find("blockquote")).toHaveLength(0)
  })

  it("does not render tables", () => {
    const props = getHeadingProps({
      body: `| Syntax | Description |
           | ----------- | ----------- |
           | Header      | Title       |
           | Paragraph   | Text        |`,
    })
    const wrapper = mount(<Heading {...props} />)
    expect(wrapper.find("h1").text()).toEqual(`| Syntax | Description |`)
    expect(wrapper.find("RenderedMarkdown").at(1).text()).toEqual(
      `| ----------- | ----------- |
       | Header      | Title       |
       | Paragraph   | Text        |`
    )
    expect(wrapper.find("table")).toHaveLength(0)
  })
})
