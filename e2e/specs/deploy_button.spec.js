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

describe("deploy button and modal", () => {
  beforeEach(() => {
    cy.loadApp("http://localhost:3000/?_stcore_testing=true");

    cy.prepForElementSnapshots();
  });

  it("renders the deploy button correctly", () => {
    cy.get("div[class='stDeployButton']").matchThemedSnapshots(
      "deploy_button"
    );
  });

  it("renders the light deploy dialog correctly", () => {
    cy.get("div[class='stDeployButton'] > button").click({ force: true });

    cy.get("div[role='dialog']").matchImageSnapshot(
      "deploy_dialog_opened"
    );
  });

  it("renders the dark deploy dialog correctly", () => {
    cy.changeTheme("Dark");

    cy.get("div[class='stDeployButton'] > button").click({ force: true });

    cy.get("div[role='dialog']").matchImageSnapshot(
      "deploy_dialog_opened-dark"
    );
  });
});
