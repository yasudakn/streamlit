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
import Dropzone, { FileRejection } from "react-dropzone"
import BaseButton, {
  BaseButtonKind,
  BaseButtonSize,
} from "@streamlit/lib/src/components/shared/BaseButton"

import { StyledFileDropzoneSection } from "./styled-components"
import FileDropzoneInstructions from "./FileDropzoneInstructions"

export interface Props {
  disabled: boolean
  onDrop: (acceptedFiles: File[], rejectedFiles: FileRejection[]) => void
  multiple: boolean
  acceptedExtensions: string[]
  maxSizeBytes: number
  label: string
}

const FileDropzone = ({
  onDrop,
  multiple,
  acceptedExtensions,
  maxSizeBytes,
  disabled,
  label,
}: Props): React.ReactElement => (
  <Dropzone
    onDrop={onDrop}
    multiple={multiple}
    accept={acceptedExtensions.length ? acceptedExtensions : undefined}
    maxSize={maxSizeBytes}
    disabled={disabled}
    // react-dropzone v12+ uses the File System Access API by default,
    // causing the bug described in https://github.com/streamlit/streamlit/issues/6176.
    useFsAccessApi={false}
  >
    {({ getRootProps, getInputProps }) => (
      <StyledFileDropzoneSection
        {...getRootProps()}
        data-testid="stFileUploadDropzone"
        isDisabled={disabled}
        aria-label={label}
      >
        <input {...getInputProps()} />
        <FileDropzoneInstructions
          multiple={multiple}
          acceptedExtensions={acceptedExtensions}
          maxSizeBytes={maxSizeBytes}
        />
        <BaseButton
          kind={BaseButtonKind.SECONDARY}
          disabled={disabled}
          size={BaseButtonSize.SMALL}
        >
          Browse files
        </BaseButton>
      </StyledFileDropzoneSection>
    )}
  </Dropzone>
)

export default FileDropzone
