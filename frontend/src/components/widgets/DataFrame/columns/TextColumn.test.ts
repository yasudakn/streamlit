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

import { GridCellKind, TextCell } from "@glideapps/glide-data-grid"

import TextColumn from "./TextColumn"

const MOCK_TEXT_COLUMN_PROPS = {
  id: "1",
  title: "Text column",
  indexNumber: 0,
  isEditable: false,
  isHidden: false,
  isIndex: false,
  isStretched: false,
  arrowType: {
    // The arrow type of the underlying data is
    // not used for anything inside the column.
    pandas_type: "unicode",
    numpy_type: "object",
  },
}

describe("TextColumn", () => {
  it("creates a valid column instance", () => {
    const mockColumn = TextColumn(MOCK_TEXT_COLUMN_PROPS)
    expect(mockColumn.kind).toEqual("text")
    expect(mockColumn.title).toEqual(MOCK_TEXT_COLUMN_PROPS.title)
    expect(mockColumn.id).toEqual(MOCK_TEXT_COLUMN_PROPS.id)
    expect(mockColumn.sortMode).toEqual("default")

    const mockCell = mockColumn.getCell("foo")
    expect(mockCell.kind).toEqual(GridCellKind.Text)
    expect((mockCell as TextCell).data).toEqual("foo")
  })

  it.each([
    ["foo", "foo"],
    ["abc def 1234 $", "abc def 1234 $"],
    [1, "1"],
    [0, "0"],
    [0.123, "0.123"],
    ["", ""],
    [[], ""],
    [["foo", "bar"], "foo,bar"],
    [[1, 2, 0.1231], "1,2,0.1231"],
    [true, "true"],
    [
      {
        foo: "bar",
      },
      "[object Object]",
    ],
    [null, null],
    [undefined, null],
  ])(
    "supports string-compatible value (%p parsed as %p)",
    (input: any, value: string | null) => {
      const mockColumn = TextColumn(MOCK_TEXT_COLUMN_PROPS)
      const cell = mockColumn.getCell(input)
      expect(mockColumn.getCellValue(cell)).toEqual(value)
    }
  )
})
