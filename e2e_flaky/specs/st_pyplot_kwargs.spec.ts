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

/// <reference types="cypress" />

describe("st.pyplot with kwargs", () => {
  before(() => {
    cy.loadApp("http://localhost:3000/");

    // Wait for the site to be fully loaded
    cy.contains("Done!", { timeout: 100000 }).should($els => {
      expect($els).to.have.length.of.at.least(1);
    });

    cy.prepForElementSnapshots();
  });

  it("draws long text strings correctly", () => {
    cy.get("[data-testid='stImage']")
      .find("img")
      .should("have.attr", "src");
    cy.get("[data-testid='stImage'] > img").matchThemedSnapshots(
      "pyplot-long-text-strings"
    );
  });
});
