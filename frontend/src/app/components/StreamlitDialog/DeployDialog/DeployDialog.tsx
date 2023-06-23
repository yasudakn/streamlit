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

import React, { ReactElement, ReactNode, useCallback } from "react"
import { SegmentMetricsManager } from "src/app/SegmentMetricsManager"
import Modal from "./DeployModal"
import Card from "./DeployCard"
import ListElement from "./DeployListElement"
import { StyledBody, StyledAction } from "baseui/card"
import {
  StyledSubheader,
  StyledActionsWrapper,
  StyledCardContainer,
} from "./styled-components"
import {
  DialogType,
  PlainEventHandler,
} from "src/app/components/StreamlitDialog/StreamlitDialog"
import BaseButton, {
  BaseButtonKind,
} from "src/lib/components/shared/BaseButton"
import StreamlitLogo from "src/assets/svg/logo.svg"
import Rocket from "src/assets/svg/rocket.svg"
import {
  STREAMLIT_COMMUNITY_CLOUD_DOCS_URL,
  STREAMLIT_DEPLOY_TUTORIAL_URL,
} from "src/lib/urls"
import {
  DetachedHead,
  ModuleIsNotAdded,
  NoRepositoryDetected,
} from "src/app/components/StreamlitDialog/DeployErrorDialogs"
import { getDeployAppUrl } from "src/app/components/MainMenu/MainMenu"
import { GitInfo, IGitInfo } from "src/lib/proto"

const { GitStates } = GitInfo

export interface DeployDialogProps {
  type: DialogType.DEPLOY_DIALOG
  onClose: PlainEventHandler
  showDeployError: (
    title: string,
    errorNode: ReactNode,
    onContinue?: () => void
  ) => void
  isDeployErrorModalOpen: boolean
  gitInfo: IGitInfo | null
  metricsMgr: SegmentMetricsManager
}

export function DeployDialog(props: DeployDialogProps): ReactElement {
  const { onClose, metricsMgr } = props
  const onClickDeployApp = useCallback((): void => {
    const { showDeployError, isDeployErrorModalOpen, gitInfo, metricsMgr } =
      props
    metricsMgr.enqueue("deployButtonInDialog", { clicked: true })

    if (!gitInfo) {
      const dialog = NoRepositoryDetected()

      showDeployError(dialog.title, dialog.body)

      return
    }

    const {
      repository,
      branch,
      module,
      untrackedFiles,
      state: gitState,
    } = gitInfo
    const hasMissingGitInfo = !repository || !branch || !module

    if (hasMissingGitInfo && gitState === GitStates.DEFAULT) {
      const dialog = NoRepositoryDetected()

      showDeployError(dialog.title, dialog.body)

      return
    }

    if (gitState === GitStates.HEAD_DETACHED) {
      const dialog = DetachedHead()

      showDeployError(dialog.title, dialog.body)

      return
    }

    if (module && untrackedFiles?.includes(module)) {
      const dialog = ModuleIsNotAdded(module)

      showDeployError(dialog.title, dialog.body)

      return
    }

    // We should close the modal when we try again and everything goes fine
    if (isDeployErrorModalOpen) {
      onClose()
    }

    getDeployAppUrl(gitInfo)()
  }, [props, onClose])

  return (
    <Modal onClose={onClose}>
      <StyledCardContainer>
        <Card>
          <StyledBody>
            <img src={StreamlitLogo} alt={"Streamlit Logo"} />
            <StyledSubheader>Streamlit Community Cloud</StyledSubheader>
            <ListElement extraSpacing={true}>For the community</ListElement>
            <ListElement extraSpacing={true}>
              Deploy unlimited public apps for free
            </ListElement>
            <ListElement extraSpacing={true}>
              Apps are discoverable through the Streamlit gallery and search
              engines
            </ListElement>
          </StyledBody>
          <StyledAction>
            <StyledActionsWrapper>
              <BaseButton
                kind={BaseButtonKind.SECONDARY}
                onClick={onClickDeployApp}
              >
                Deploy now
              </BaseButton>
              <BaseButton
                onClick={() => {
                  metricsMgr.enqueue("readMoreCommunityCloudInDeployDialog", {
                    clicked: true,
                  })
                  window.open(STREAMLIT_COMMUNITY_CLOUD_DOCS_URL, "_blank")
                }}
                kind={BaseButtonKind.MINIMAL}
              >
                Read more
              </BaseButton>
            </StyledActionsWrapper>
          </StyledAction>
        </Card>
        <Card>
          <StyledBody>
            <img src={Rocket} alt={"Rocket"} />
            <StyledSubheader>Custom deployment</StyledSubheader>
            <ListElement>For companies</ListElement>
            <ListElement>
              Deploy on your own hardware or in the cloud, with Docker,
              Kubernetes, etc
            </ListElement>
            <ListElement>Set up your own authentication</ListElement>
          </StyledBody>
          <StyledAction>
            <StyledActionsWrapper>
              <BaseButton
                onClick={() => {
                  metricsMgr.enqueue("readMoreDeployTutorialInDeployDialog", {
                    clicked: true,
                  })
                  window.open(STREAMLIT_DEPLOY_TUTORIAL_URL, "_blank")
                }}
                kind={BaseButtonKind.MINIMAL}
              >
                Read more
              </BaseButton>
            </StyledActionsWrapper>
          </StyledAction>
        </Card>
      </StyledCardContainer>
    </Modal>
  )
}
