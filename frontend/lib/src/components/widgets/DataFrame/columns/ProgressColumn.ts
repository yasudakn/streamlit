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
  GridCellKind,
  LoadingCell,
} from "@glideapps/glide-data-grid"
import { RangeCellType } from "@glideapps/glide-data-grid-cells"

import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import {
  isNullOrUndefined,
  notNullOrUndefined,
} from "@streamlit/lib/src/util/utils"
import { isIntegerType } from "@streamlit/lib/src/components/widgets/DataFrame/isIntegerType"

import {
  BaseColumn,
  BaseColumnProps,
  getErrorCell,
  getEmptyCell,
  toSafeString,
  mergeColumnParameters,
  formatNumber,
  toSafeNumber,
  countDecimals,
} from "./utils"

export interface ProgressColumnParams {
  // The minimum permitted value. Defaults to 0.
  readonly min_value?: number
  // The maximum permitted value. Defaults to 100 if the underlying data is integer,
  // or 1 for all others types.
  readonly max_value?: number
  // A formatting syntax (e.g. sprintf) to format the display value.
  // This can be used for adding prefix or suffix, or changing the number of decimals of the display value.
  readonly format?: string
  // The stepping interval. Defaults to 0.01.
  // Mainly useful once we provide editing capabilities.
  readonly step?: number
}

/**
 * A read-only column type to support rendering values that have a defined
 * range. This is rendered via a progress-bar-like visualization.
 */
function ProgressColumn(props: BaseColumnProps): BaseColumn {
  const arrowTypeName = Quiver.getTypeName(props.arrowType)
  const isInteger = isIntegerType(arrowTypeName)

  const parameters = mergeColumnParameters(
    // Default parameters:
    {
      min_value: 0,
      max_value: isInteger ? 100 : 1,
      step: isInteger ? 1 : 0.01,
      format: isInteger ? "%3d%%" : "percent",
    } as ProgressColumnParams,
    // User parameters:
    props.columnTypeOptions
  ) as ProgressColumnParams

  // Measure the display value of the max value, so that all progress bars are aligned correctly:
  let measureLabel: string
  try {
    measureLabel = formatNumber(
      parameters.max_value as number,
      parameters.format
    )
  } catch (error) {
    measureLabel = toSafeString(parameters.max_value)
  }

  const fixedDecimals =
    isNullOrUndefined(parameters.step) || Number.isNaN(parameters.step)
      ? undefined
      : countDecimals(parameters.step)

  const cellTemplate = {
    kind: GridCellKind.Custom,
    allowOverlay: false,
    copyData: "",
    contentAlign: props.contentAlignment,
    data: {
      kind: "range-cell",
      min: parameters.min_value,
      max: parameters.max_value,
      step: parameters.step,
      value: parameters.min_value,
      label: String(parameters.min_value),
      measureLabel,
      readonly: true,
    },
  } as RangeCellType

  return {
    ...props,
    kind: "progress",
    sortMode: "smart",
    isEditable: false, // Progress column is always readonly
    getCell(data?: any): GridCell {
      if (isNullOrUndefined(data)) {
        // TODO(lukasmasuch): Use a missing cell?
        return getEmptyCell()
      }

      if (
        isNullOrUndefined(parameters.min_value) ||
        isNullOrUndefined(parameters.max_value) ||
        Number.isNaN(parameters.min_value) ||
        Number.isNaN(parameters.max_value) ||
        parameters.min_value >= parameters.max_value
      ) {
        return getErrorCell(
          "Invalid min/max parameters",
          `The min_value (${parameters.min_value}) and max_value (${parameters.max_value}) parameters must be valid numbers.`
        )
      }

      if (
        isNullOrUndefined(parameters.step) ||
        Number.isNaN(parameters.step)
      ) {
        return getErrorCell(
          "Invalid step parameter",
          `The step parameter (${parameters.step}) must be a valid number.`
        )
      }

      const cellData = toSafeNumber(data)

      if (Number.isNaN(cellData) || isNullOrUndefined(cellData)) {
        return getErrorCell(
          toSafeString(data),
          "The value cannot be interpreted as a number."
        )
      }

      // Check if the value is larger than the maximum supported value:
      if (Number.isInteger(cellData) && !Number.isSafeInteger(cellData)) {
        return getErrorCell(
          toSafeString(data),
          "The value is larger than the maximum supported integer values in number columns (2^53)."
        )
      }

      let displayData = ""

      try {
        displayData = formatNumber(cellData, parameters.format, fixedDecimals)
      } catch (error) {
        return getErrorCell(
          toSafeString(cellData),
          notNullOrUndefined(parameters.format)
            ? `Failed to format the number based on the provided format configuration: (${parameters.format}). Error: ${error}`
            : `Failed to format the number. Error: ${error}`
        )
      }

      // If the value is outside the range, we scale it to the min/max
      // for the visualization.
      const normalizeCellValue = Math.min(
        parameters.max_value,
        Math.max(parameters.min_value, cellData)
      )

      return {
        ...cellTemplate,
        isMissingValue: isNullOrUndefined(data),
        copyData: String(cellData), // Column sorting is done via the copyData value
        data: {
          ...cellTemplate.data,
          value: normalizeCellValue,
          label: displayData,
        },
      } as RangeCellType
    },
    getCellValue(cell: RangeCellType | LoadingCell): number | null {
      if (cell.kind === GridCellKind.Loading) {
        return null
      }
      return cell.data?.value === undefined ? null : cell.data?.value
    },
  }
}

ProgressColumn.isEditableType = false

export default ProgressColumn
