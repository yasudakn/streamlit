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
import { Plus, Minus } from "@emotion-icons/open-iconic"
import { withTheme } from "@emotion/react"
import { sprintf } from "sprintf-js"

import { FormClearHelper } from "@streamlit/lib/src/components/widgets/Form"
import { logWarning } from "@streamlit/lib/src/util/log"
import { NumberInput as NumberInputProto } from "@streamlit/lib/src/proto"
import { breakpoints } from "@streamlit/lib/src/theme/primitives/breakpoints"
import {
  WidgetStateManager,
  Source,
} from "@streamlit/lib/src/WidgetStateManager"
import TooltipIcon from "@streamlit/lib/src/components/shared/TooltipIcon"
import { Placement } from "@streamlit/lib/src/components/shared/Tooltip"
import Icon from "@streamlit/lib/src/components/shared/Icon"
import { Input as UIInput } from "baseui/input"
import InputInstructions from "@streamlit/lib/src/components/shared/InputInstructions/InputInstructions"
import {
  WidgetLabel,
  StyledWidgetLabelHelp,
} from "@streamlit/lib/src/components/widgets/BaseWidget"
import { EmotionTheme } from "@streamlit/lib/src/theme"
import {
  isInForm,
  labelVisibilityProtoValueToEnum,
  isNullOrUndefined,
  notNullOrUndefined,
} from "@streamlit/lib/src/util/utils"

import {
  StyledInputContainer,
  StyledInputControl,
  StyledInputControls,
  StyledInstructionsContainer,
} from "./styled-components"
import uniqueId from "lodash/uniqueId"

export interface Props {
  disabled: boolean
  element: NumberInputProto
  widgetMgr: WidgetStateManager
  width: number
  theme: EmotionTheme
}

export interface State {
  /**
   * True if the user-specified state.value has not yet been synced to the WidgetStateManager.
   */
  dirty: boolean

  /**
   * The value specified by the user via the UI. If the user didn't touch this
   * widget's UI, the default value is used.
   */
  value: number | null

  /**
   * The value with applied format that is going to be shown to the user
   */
  formattedValue: string | null

  /**
   * True if the input is selected
   */
  isFocused: boolean
}

export class NumberInput extends React.PureComponent<Props, State> {
  private readonly formClearHelper = new FormClearHelper()

  private readonly id: string

  private inputRef = React.createRef<HTMLInputElement | HTMLTextAreaElement>()

  constructor(props: Props) {
    super(props)

    this.state = {
      dirty: false,
      value: this.initialValue,
      formattedValue: this.formatValue(this.initialValue),
      isFocused: false,
    }

    this.id = uniqueId("number_input_")
  }

  get initialValue(): number | null {
    // If WidgetStateManager knew a value for this widget, initialize to that.
    // Otherwise, use the default value from the widget protobuf
    const storedValue = this.isIntData()
      ? this.props.widgetMgr.getIntValue(this.props.element)
      : this.props.widgetMgr.getDoubleValue(this.props.element)

    return storedValue ?? this.props.element.default ?? null
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
    this.setState(
      {
        value: value ?? null,
        formattedValue: this.formatValue(value ?? null),
      },
      () => {
        this.commitWidgetValue({ fromUi: false })
      }
    )
  }

  private formatValue = (value: number | null): string | null => {
    if (isNullOrUndefined(value)) {
      return null
    }

    const format = getNonEmptyString(this.props.element.format)
    if (format == null) {
      return value.toString()
    }

    try {
      return sprintf(format, value)
    } catch (e) {
      // Don't explode if we have a malformed format string.
      logWarning(`Error in sprintf(${format}, ${value}): ${e}`)
      return String(value)
    }
  }

  private isIntData = (): boolean => {
    return this.props.element.dataType === NumberInputProto.DataType.INT
  }

  private getMin = (): number => {
    return this.props.element.hasMin ? this.props.element.min : -Infinity
  }

  private getMax = (): number => {
    return this.props.element.hasMax ? this.props.element.max : +Infinity
  }

  private getStep = (): number => {
    const { step } = this.props.element

    if (step) {
      return step
    }
    if (this.isIntData()) {
      return 1
    }
    return 0.01
  }

  /** Commit state.value to the WidgetStateManager. */
  private commitWidgetValue = (source: Source): void => {
    const { value } = this.state
    const { element, widgetMgr } = this.props
    const data = this.props.element

    const min = this.getMin()
    const max = this.getMax()

    if (notNullOrUndefined(value) && (min > value || value > max)) {
      const node = this.inputRef.current
      if (node) {
        node.reportValidity()
      }
    } else {
      const valueToBeSaved = value ?? data.default ?? null

      if (this.isIntData()) {
        widgetMgr.setIntValue(element, valueToBeSaved, source)
      } else {
        widgetMgr.setDoubleValue(element, valueToBeSaved, source)
      }

      this.setState({
        dirty: false,
        value: valueToBeSaved,
        formattedValue: this.formatValue(valueToBeSaved),
      })
    }
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

    this.setState({ isFocused: false })
  }

  private onFocus = (): void => {
    this.setState({ isFocused: true })
  }

  private onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { value } = e.target

    if (value === "") {
      this.setState({
        dirty: true,
        value: null,
        formattedValue: null,
      })
    } else {
      let numValue: number

      if (this.isIntData()) {
        numValue = parseInt(value, 10)
      } else {
        numValue = parseFloat(value)
      }

      this.setState({
        dirty: true,
        value: numValue,
        formattedValue: value,
      })
    }
  }

  private onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { key } = e

    switch (key) {
      case "ArrowUp":
        e.preventDefault()

        this.modifyValueUsingStep("increment")()
        break
      case "ArrowDown":
        e.preventDefault()

        this.modifyValueUsingStep("decrement")()
        break
      default: // Do nothing
    }
  }

  private onKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    if (e.key === "Enter") {
      if (this.state.dirty) {
        this.commitWidgetValue({ fromUi: true })
      }
      if (isInForm(this.props.element)) {
        this.props.widgetMgr.submitForm(this.props.element.formId)
      }
    }
  }

  /** True if the input's current value can be decremented by its step. */
  private get canDecrement(): boolean {
    if (isNullOrUndefined(this.state.value)) {
      return false
    }

    return this.state.value - this.getStep() >= this.getMin()
  }

  /** True if the input's current value can be incremented by its step. */
  private get canIncrement(): boolean {
    if (isNullOrUndefined(this.state.value)) {
      return false
    }

    return this.state.value + this.getStep() <= this.getMax()
  }

  private modifyValueUsingStep =
    (modifier: "increment" | "decrement"): any =>
    (): void => {
      const { value } = this.state
      const step = this.getStep()

      switch (modifier) {
        case "increment":
          if (this.canIncrement) {
            this.setState(
              {
                dirty: true,
                value: (value ?? this.getMin()) + step,
              },
              () => {
                this.commitWidgetValue({ fromUi: true })
              }
            )
          }
          break
        case "decrement":
          if (this.canDecrement) {
            this.setState(
              {
                dirty: true,
                value: (value ?? this.getMax()) - step,
              },
              () => {
                this.commitWidgetValue({ fromUi: true })
              }
            )
          }
          break
        default: // Do nothing
      }
    }

  public render(): React.ReactNode {
    const { element, width, disabled, widgetMgr, theme } = this.props
    const { formattedValue, dirty, isFocused } = this.state

    const style = { width }

    const disableDecrement = !this.canDecrement || disabled
    const disableIncrement = !this.canIncrement || disabled
    const clearable = isNullOrUndefined(element.default) && !disabled

    // Manage our form-clear event handler.
    this.formClearHelper.manageFormClearListener(
      widgetMgr,
      element.formId,
      this.onFormCleared
    )

    return (
      <div className="stNumberInput" style={style} data-testid="stNumberInput">
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
        <StyledInputContainer
          className={isFocused ? "focused" : ""}
          data-testid="stNumberInputContainer"
        >
          <UIInput
            type="number"
            inputRef={this.inputRef}
            value={formattedValue ?? ""}
            placeholder={element.placeholder}
            onBlur={this.onBlur}
            onFocus={this.onFocus}
            onChange={this.onChange}
            onKeyPress={this.onKeyPress}
            onKeyDown={this.onKeyDown}
            clearable={clearable}
            clearOnEscape={clearable}
            disabled={disabled}
            aria-label={element.label}
            id={this.id}
            overrides={{
              ClearIcon: {
                props: {
                  overrides: {
                    Svg: {
                      style: {
                        color: theme.colors.darkGray,
                        // Since the close icon is an SVG, and we can't control its viewbox nor its attributes,
                        // Let's use a scale transform effect to make it bigger.
                        // The width property only enlarges its bounding box, so it's easier to click.
                        transform: "scale(1.4)",
                        width: theme.spacing.twoXL,
                        marginRight: "-1.25em",

                        ":hover": {
                          fill: theme.colors.bodyText,
                        },
                      },
                    },
                  },
                },
              },
              Input: {
                props: {
                  "data-testid": "stNumberInput-Input",
                  step: this.getStep(),
                  min: this.getMin(),
                  max: this.getMax(),
                },
                style: {
                  lineHeight: "1.4",
                  // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
                  paddingRight: ".5rem",
                  paddingLeft: ".5rem",
                  paddingBottom: ".5rem",
                  paddingTop: ".5rem",
                },
              },
              InputContainer: {
                style: () => ({
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                }),
              },
              Root: {
                style: () => ({
                  borderTopRightRadius: 0,
                  borderBottomRightRadius: 0,
                  // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
                  borderLeftWidth: 0,
                  borderRightWidth: 0,
                  borderTopWidth: 0,
                  borderBottomWidth: 0,
                }),
              },
            }}
          />

          {/* We only want to show the increment/decrement controls when there is sufficient room to display the value and these controls. */}
          {width > breakpoints.hideNumberInputControls && (
            <StyledInputControls>
              <StyledInputControl
                className="step-down"
                data-testid="stNumberInput-StepDown"
                onClick={this.modifyValueUsingStep("decrement")}
                disabled={disableDecrement}
                tabIndex={-1}
              >
                <Icon
                  content={Minus}
                  size="xs"
                  color={this.canDecrement ? "inherit" : "disabled"}
                />
              </StyledInputControl>
              <StyledInputControl
                className="step-up"
                data-testid="stNumberInput-StepUp"
                onClick={this.modifyValueUsingStep("increment")}
                disabled={disableIncrement}
                tabIndex={-1}
              >
                <Icon
                  content={Plus}
                  size="xs"
                  color={this.canIncrement ? "inherit" : "disabled"}
                />
              </StyledInputControl>
            </StyledInputControls>
          )}
        </StyledInputContainer>
        {/* Hide the "Please enter to apply" text in small widget sizes */}
        {width > breakpoints.hideWidgetDetails && (
          <StyledInstructionsContainer clearable={clearable}>
            <InputInstructions
              dirty={dirty}
              value={formattedValue ?? ""}
              className="input-instructions"
              inForm={isInForm({ formId: element.formId })}
            />
          </StyledInstructionsContainer>
        )}
      </div>
    )
  }
}

/**
 * Return a string property from an element. If the string is
 * null or empty, return undefined instead.
 */
function getNonEmptyString(
  value: string | null | undefined
): string | undefined {
  return value == null || value === "" ? undefined : value
}

export default withTheme(NumberInput)
