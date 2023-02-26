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

import React, { useState } from "react"

import { GridColumn, DataEditorProps } from "@glideapps/glide-data-grid"

type ColumnSizerReturn = Pick<DataEditorProps, "columns" | "onColumnResize">

/**
 * Hook to manage the interactive column resizing capabilities.
 *
 * @param columns - The columns of the table.
 *
 * @returns An object containing the following properties:
 * - columns: The updated list of columns.
 * - onColumnResize: The callback function to be called when a column is resized.
 */
function useColumnSizer(columns: GridColumn[]): ColumnSizerReturn {
  // The columns with the corresponding empty template for every type:
  const [columnSizes, setColumnSizes] = useState<Map<string, number>>(
    () => new Map()
  )

  const onColumnResize = React.useCallback(
    (
      column: GridColumn,
      _newSize: number,
      _colIndex: number,
      newSizeWithGrow: number
    ) => {
      if (column.id) {
        setColumnSizes(new Map(columnSizes).set(column.id, newSizeWithGrow))
      }
    },
    [columnSizes]
  )

  // Apply column widths from state:
  const sizedColumns = columns.map(column => {
    if (
      column.id &&
      columnSizes.has(column.id) &&
      columnSizes.get(column.id) !== undefined
    ) {
      return {
        ...column,
        width: columnSizes.get(column.id),
        // Deactivate grow whenever a column gets manually resized
        grow: 0,
      } as GridColumn
    }
    return column
  })

  return {
    columns: sizedColumns,
    onColumnResize,
  }
}

export default useColumnSizer
