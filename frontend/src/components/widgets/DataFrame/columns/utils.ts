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

import {
  GridCell,
  Theme as GlideTheme,
  TextCell,
  GridCellKind,
  LoadingCell,
  GridColumn,
} from "@glideapps/glide-data-grid"
import { toString, merge, isArray } from "lodash"
import numbro from "numbro"

import { Type as ArrowType } from "src/lib/Quiver"
import { notNullOrUndefined, isNullOrUndefined } from "src/lib/utils"

/**
 * Interface used for defining the properties (configuration options) of a column.
 * These options can also be used to overwrite from user-defined column config.
 */
export interface BaseColumnProps {
  // The id of the column:
  readonly id: string
  // The title of the column:
  readonly title: string
  // The index number of the column:
  readonly indexNumber: number
  // The arrow data type of the column:
  readonly arrowType: ArrowType
  // If `True`, the column can be edited:
  readonly isEditable: boolean
  // If `True`, the column is hidden (will not be shown):
  readonly isHidden: boolean
  // If `True`, the column is a table index:
  readonly isIndex: boolean
  // If `True`, the column is a stretched:
  readonly isStretched: boolean
  // The initial width of the column:
  readonly width?: number
  // Column type selected via column config:
  readonly customType?: string
  // Additional metadata related to the column type:
  readonly columnTypeMetadata?: Record<string, any>
  // The content alignment of the column:
  readonly contentAlignment?: "left" | "center" | "right"
  // Theme overrides for this column:
  readonly themeOverride?: Partial<GlideTheme>
}

/**
 * The interface that is implemented by any column type.
 */
export interface BaseColumn extends BaseColumnProps {
  readonly kind: string
  // Defines the sort mode that should be used for this column type:
  // default: Sorts by interpreting all values as strings.
  // smart: Detects if value is a number or a string and sorts accordingly.
  // raw: Sorts based on the actual type of the cell data value.
  readonly sortMode: "default" | "raw" | "smart"
  // Get a cell with the provided data for the column type:
  getCell(data?: any): GridCell
  // Get the raw cell of a provided cell:
  getCellValue(cell: GridCell): any | null
}

/**
 * A type that describes the function signature used to create a column based on
 * some column properties.
 */
export type ColumnCreator = {
  (props: BaseColumnProps): BaseColumn
  readonly isEditableType: boolean
}

/**
 * Interface used for indicating if a cell contains an error.
 */
interface ErrorCell extends TextCell {
  readonly isError: true
}

/**
 * Returns a cell with an error message.
 *
 * @param errorMsg: A short error message to use as display value.
 * @param errorDetails: The full error message to show when the user
 *                     clicks on a cell.
 *
 * @return a read-only GridCell object that can be used by glide-data-grid.
 */
export function getErrorCell(errorMsg: string, errorDetails = ""): ErrorCell {
  errorMsg = `⚠️ ${errorMsg}`
  return {
    kind: GridCellKind.Text,
    readonly: true,
    allowOverlay: true,
    data: errorMsg + (errorDetails ? `\n\n${errorDetails}\n` : ""),
    displayData: errorMsg,
    isError: true,
  } as ErrorCell
}

/**
 * Returns `true` if the given cell contains an error.
 * This can happen if the value type is not compatible with
 * the given value type.
 */
export function isErrorCell(cell: GridCell): cell is ErrorCell {
  return cell.hasOwnProperty("isError") && (cell as ErrorCell).isError
}

/**
 * Interface used for indicating if a cell contains no value.
 */
interface MissingValueCell extends TextCell {
  readonly isMissingValue: true
}

/**
 * Returns `true` if the given cell contains no value (-> missing value).
 * For example, a number cell that contains null is interpreted as a missing value.
 */
export function isMissingValueCell(cell: GridCell): cell is MissingValueCell {
  return (
    cell.hasOwnProperty("isMissingValue") &&
    (cell as MissingValueCell).isMissingValue
  )
}

/**
 * Returns an empty cell.
 */
export function getEmptyCell(): LoadingCell {
  return {
    kind: GridCellKind.Loading,
    allowOverlay: false,
  } as LoadingCell
}

/**
 * Returns an empty text cell.
 *
 * @param readonly: If true, returns a read-only version of the cell.
 * @param faded: If true, returns a faded version of the cell.
 *
 * @return a GridCell object that can be used by glide-data-grid.
 */
export function getTextCell(readonly: boolean, faded: boolean): TextCell {
  const style = faded ? "faded" : "normal"
  return {
    kind: GridCellKind.Text,
    data: "",
    displayData: "",
    allowOverlay: true,
    readonly,
    style,
  } as TextCell
}

/**
 * Converts from our BaseColumn format to the glide-data-grid compatible GridColumn.
 */
export function toGlideColumn(column: BaseColumn): GridColumn {
  return {
    id: column.id,
    title: column.title,
    hasMenu: false,
    themeOverride: column.themeOverride,
    ...(column.isStretched && {
      grow: column.isIndex ? 1 : 3,
    }),
    ...(column.width && {
      width: column.width,
    }),
  } as GridColumn
}

/**
 * Merges the default column parameters with the user-defined column parameters.
 *
 * @param defaultParams - The default column parameters.
 * @param userParams - The user-defined column parameters.
 *
 * @returns The merged column parameters.
 */
export function mergeColumnParameters(
  defaultParams: Record<string, any> | undefined | null,
  userParams: Record<string, any> | undefined | null
): Record<string, any> {
  if (isNullOrUndefined(defaultParams)) {
    return userParams || {}
  }

  if (isNullOrUndefined(userParams)) {
    return defaultParams || {}
  }

  return merge(defaultParams, userParams)
}

/**
 * Converts the given value of unknown type to an array without
 * the risks of any exceptions.
 *
 * @param data - The value to convert to an array.
 *
 * @returns The converted array or an empty array if the value cannot be interpreted as an array.
 */
export function toSafeArray(data: any): any[] {
  if (isNullOrUndefined(data)) {
    return []
  }

  if (typeof data === "number" || typeof data === "boolean") {
    // Single number or boolean
    return [data]
  }

  if (typeof data === "string") {
    if (data === "") {
      // Empty string
      return []
    }

    // Try to parse string to an array
    if (data.trim().startsWith("[") && data.trim().endsWith("]")) {
      // Support for JSON arrays: ["foo", 1, null, "test"]
      try {
        return JSON.parse(data)
      } catch (error) {
        return [data]
      }
    } else {
      // Support for comma-separated values: "foo,1,,test"
      return data.split(",")
    }
  }

  try {
    const parsedData = JSON.parse(
      JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    )
    if (!isArray(parsedData)) {
      return [toSafeString(parsedData)]
    }

    return parsedData.map((value: any) =>
      ["string", "number", "boolean", "null"].includes(typeof value)
        ? value
        : toSafeString(value)
    )
  } catch (error) {
    return [toSafeString(data)]
  }
}

/**
 * Converts the given value of unknown type to a string without
 * the risks of any exceptions.
 *
 * @param data - The value to convert to a string.
 *
 * @return The converted string or a string showing the type of the object as fallback.
 */
export function toSafeString(data: any): string {
  try {
    try {
      return toString(data)
    } catch (error) {
      return JSON.stringify(data, (_key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    }
  } catch (error) {
    // This is most likely an object that cannot be converted to a string
    // console.log converts this to `[object Object]` which we are doing here as well:
    return `[${typeof data}]`
  }
}

/**
 * Converts the given value of unknown type to a number without
 * the risks of any exceptions.
 *
 * @param value - The value to convert to a number.
 *
 * @returns The converted number or null if the value cannot be interpreted as a number.
 */
export function toSafeNumber(value: any): number | null {
  // TODO(lukasmasuch): Should this return null as replacement for NaN?

  if (isNullOrUndefined(value)) {
    return null
  }

  if (isArray(value)) {
    return NaN
  }

  if (typeof value === "string") {
    if (value.trim().length === 0) {
      // Empty string should return null
      return null
    }

    try {
      // Try to convert string to number via numbro:
      // https://numbrojs.com/old-format.html#unformat
      const unformattedValue = numbro.unformat(value.trim())
      if (notNullOrUndefined(unformattedValue)) {
        return unformattedValue
      }
    } catch (error) {
      // Do nothing here
    }
  } else if (value instanceof Int32Array) {
    // int values need to be extracted this way:
    // eslint-disable-next-line prefer-destructuring
    return Number(value[0])
  }

  return Number(value)
}

/**
 * Formats the given number to a string with the given maximum precision.
 *
 * @param value - The number to format.
 * @param maxPrecision - The maximum number of decimals to show.
 * @param keepTrailingZeros - Whether to keep trailing zeros.
 *
 * @returns The formatted number as a string.
 */
export function formatNumber(
  value: number,
  maxPrecision = 4,
  keepTrailingZeros = false
): string {
  if (!Number.isNaN(value) && Number.isFinite(value)) {
    if (maxPrecision === 0) {
      // Numbro is unable to format the numb with 0 decimals.
      value = Math.round(value)
    }
    return numbro(value).format(
      keepTrailingZeros
        ? `0,0.${"0".repeat(maxPrecision)}`
        : `0,0.[${"0".repeat(maxPrecision)}]`
    )
  }
  return ""
}
