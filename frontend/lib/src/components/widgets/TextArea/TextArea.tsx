/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
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
import { TextArea as TextAreaProto } from "@streamlit/lib/src/proto"
import { FormClearHelper } from "@streamlit/lib/src/components/widgets/Form"
import {
  WidgetStateManager,
  Source,
} from "@streamlit/lib/src/WidgetStateManager"

import { Textarea as UITextArea } from "baseui/textarea"
import InputInstructions from "@streamlit/lib/src/components/shared/InputInstructions/InputInstructions"
import {
  WidgetLabel,
  StyledWidgetLabelHelp,
} from "@streamlit/lib/src/components/widgets/BaseWidget"
import TooltipIcon from "@streamlit/lib/src/components/shared/TooltipIcon"
import { Placement } from "@streamlit/lib/src/components/shared/Tooltip"
import {
  isInForm,
  labelVisibilityProtoValueToEnum,
} from "@streamlit/lib/src/util/utils"
import { breakpoints } from "@streamlit/lib/src/theme/primitives"
import { StyledTextAreaContainer } from "./styled-components"
import uniqueId from "lodash/uniqueId"

export interface Props {
  disabled: boolean
  element: TextAreaProto
  widgetMgr: WidgetStateManager
  width: number
}

interface State {
  /**
   * True if the user-specified state.value has not yet been synced to the WidgetStateManager.
   */
  dirty: boolean

  /**
   * The value specified by the user via the UI. If the user didn't touch this
   * widget's UI, the default value is used.
   */
  value: string | null
}

class TextArea extends React.PureComponent<Props, State> {
  private readonly formClearHelper = new FormClearHelper()

  private readonly id: string

  public state: State = {
    dirty: false,
    value: this.initialValue,
  }

  get initialValue(): string | null {
    // If WidgetStateManager knew a value for this widget, initialize to that.
    // Otherwise, use the default value from the widget protobuf.
    const storedValue = this.props.widgetMgr.getStringValue(this.props.element)
    return storedValue ?? this.props.element.default ?? null
  }

  constructor(props: Props) {
    super(props)
    this.id = uniqueId("text_area_")
  }

  public componentDidMount(): void {
    if (this.props.element.setValue) {
      this.updateFromProtobuf()
    } else {
      this.commitWidgetValue({ fromUi: false })
    }
  }

  public componentDidUpdate(): void {
    this.maybeUpdateFromProtobuf()
  }

  public componentWillUnmount(): void {
    this.formClearHelper.disconnect()
  }

  private maybeUpdateFromProtobuf(): void {
    const { setValue } = this.props.element
    if (setValue) {
      this.updateFromProtobuf()
    }
  }

  private updateFromProtobuf(): void {
    const { value } = this.props.element
    this.props.element.setValue = false
    this.setState({ value: value ?? null }, () => {
      this.commitWidgetValue({ fromUi: false })
    })
  }

  /** Commit state.value to the WidgetStateManager. */
  private commitWidgetValue = (source: Source): void => {
    this.props.widgetMgr.setStringValue(
      this.props.element,
      this.state.value,
      source
    )
    this.setState({ dirty: false })
  }

  /**
   * If we're part of a clear_on_submit form, this will be called when our
   * form is submitted. Restore our default value and update the WidgetManager.
   */
  private onFormCleared = (): void => {
    this.setState(
      (_, prevProps) => {
        return { value: prevProps.element.default ?? null }
      },
      () => this.commitWidgetValue({ fromUi: true })
    )
  }

  private onBlur = (): void => {
    if (this.state.dirty) {
      this.commitWidgetValue({ fromUi: true })
    }
  }

  private onChange = (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
    const { value } = e.target
    const { element } = this.props
    const { maxChars } = element

    if (maxChars !== 0 && value.length > maxChars) {
      return
    }

    // mark it dirty but don't update its value in the WidgetMgr
    // This means that individual keypresses won't trigger a script re-run.
    this.setState({ dirty: true, value })
  }

  isEnterKeyPressed = (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): boolean => {
    const { keyCode, key } = event

    // Using keyCode as well due to some different behaviors on Windows
    // https://bugs.chromium.org/p/chromium/issues/detail?id=79407
    return (
      (key === "Enter" || keyCode === 13 || keyCode === 10) &&
      // Do not send the sentence being composed when Enter is typed into the IME.
      !(event.nativeEvent?.isComposing === true)
    )
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    const { metaKey, ctrlKey } = e
    const { dirty } = this.state

    if (this.isEnterKeyPressed(e) && (ctrlKey || metaKey) && dirty) {
      e.preventDefault()

      this.commitWidgetValue({ fromUi: true })
      const { formId } = this.props.element
      if (isInForm({ formId })) {
        this.props.widgetMgr.submitForm(this.props.element.formId)
      }
    }
  }

  public render(): React.ReactNode {
    const { element, disabled, width, widgetMgr } = this.props
    const { value, dirty } = this.state
    const style = { width }
    const { height, placeholder } = element

    // Manage our form-clear event handler.
    this.formClearHelper.manageFormClearListener(
      widgetMgr,
      element.formId,
      this.onFormCleared
    )

    return (
      <div className="stTextArea" data-testid="stTextArea" style={style}>
        <WidgetLabel
          label={element.label}
          disabled={disabled}
          labelVisibility={labelVisibilityProtoValueToEnum(
            element.labelVisibility?.value
          )}
          htmlFor={this.id}
        >
          {element.help && (
            <StyledWidgetLabelHelp>
              <TooltipIcon
                content={element.help}
                placement={Placement.TOP_RIGHT}
              />
            </StyledWidgetLabelHelp>
          )}
        </WidgetLabel>
        <StyledTextAreaContainer>
          <UITextArea
            value={value ?? ""}
            placeholder={placeholder}
            onBlur={this.onBlur}
            onChange={this.onChange}
            onKeyDown={this.onKeyDown}
            aria-label={element.label}
            disabled={disabled}
            id={this.id}
            overrides={{
              Input: {
                style: {
                  lineHeight: "1.4",
                  height: height ? `${height}px` : "",
                  minHeight: "95px",
                  resize: "vertical",
                  "::placeholder": {
                    opacity: "0.7",
                  },
                  // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
                  paddingRight: "1rem",
                  paddingLeft: "1rem",
                  paddingBottom: "1rem",
                  paddingTop: "1rem",
                },
              },
            }}
          />
        </StyledTextAreaContainer>
        {/* Hide the "Please enter to apply" text in small widget sizes */}
        {width > breakpoints.hideWidgetDetails && (
          <InputInstructions
            dirty={dirty}
            value={value ?? ""}
            maxLength={element.maxChars}
            type={"multiline"}
            inForm={isInForm({ formId: element.formId })}
          />
        )}
      </div>
    )
  }
}

export default TextArea
