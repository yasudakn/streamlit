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
  BooleanCell,
  GridCellKind,
} from "@glideapps/glide-data-grid"

import { notNullOrUndefined } from "src/lib/utils"

import {
  BaseColumn,
  BaseColumnProps,
  getErrorCell,
  ColumnCreator,
  toSafeString,
} from "./utils"

// See pydantic for inspiration: https://pydantic-docs.helpmanual.io/usage/types/#booleans
const BOOLEAN_TRUE_VALUES = ["true", "t", "yes", "y", "on", "1"]
const BOOLEAN_FALSE_VALUES = ["false", "f", "no", "n", "off", "0"]

/**
 * A column type that supports optimized rendering and editing for boolean values
 * by using checkboxes.
 */
function BooleanColumn(props: BaseColumnProps): BaseColumn {
  const cellTemplate = {
    kind: GridCellKind.Boolean,
    data: false,
    allowOverlay: false, // no overlay possible
    contentAlign: props.contentAlignment,
    readonly: !props.isEditable,
    style: props.isIndex ? "faded" : "normal",
  } as BooleanCell

  return {
    ...props,
    kind: "boolean",
    sortMode: "default",
    getCell(data?: any): GridCell {
      let cellData = null

      if (notNullOrUndefined(data)) {
        if (typeof data === "boolean") {
          cellData = data
        } else {
          const cleanedValue = String(data).toLowerCase().trim()
          if (cleanedValue === "") {
            cellData = null
          } else if (BOOLEAN_TRUE_VALUES.includes(cleanedValue)) {
            cellData = true
          } else if (BOOLEAN_FALSE_VALUES.includes(cleanedValue)) {
            cellData = false
          } else {
            return getErrorCell(
              toSafeString(data),
              `The value cannot be interpreted as boolean.`
            )
          }
        }
      }

      // We are not setting isMissingValue here because the checkbox column
      // does not work with the missing cell rendering.
      return {
        ...cellTemplate,
        data: cellData,
      } as BooleanCell
    },
    getCellValue(cell: BooleanCell): boolean | null {
      return cell.data === undefined ? null : cell.data
    },
  }
}

BooleanColumn.isEditableType = true

export default BooleanColumn as ColumnCreator
