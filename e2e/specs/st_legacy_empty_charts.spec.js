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

describe("handles legacy empty charts", () => {
  before(() => {
    cy.loadApp("http://localhost:3000/");

    // Wait for the site to be fully loaded
    cy.get(".element-container").should($els => {
      expect($els).to.have.length.of.at.least(10);
    });

    cy.prepForElementSnapshots();
  });

  it("gracefully handles no data", () => {
    // vega-lite
    cy.get(".element-container [data-testid='stVegaLiteChart']").each(
      (el, i) => {
        return cy.wrap(el).matchThemedSnapshots(`legacyVegaLiteChart-${i}`);
      }
    );

    // pyplot
    cy.get("[data-testid='stImage'] > img").should("have.attr", "src");

    // BUG https://github.com/cypress-io/cypress/issues/4322
    // cy.get('.stDeckGlChart canvas')
    //  .should('exist')
  });

  it("handles no data with exception", () => {
    cy.getIndexed(".stException .message", 0).should(
      "have.text",
      "ValueError: Vega-Lite charts require a non-empty spec dict."
    );

    cy.getIndexed(".stException .message", 1).should(
      "have.text",
      "ValueError: Vega-Lite charts require a non-empty spec dict."
    );

    cy.getIndexed(".stException .message", 2).should(
      "have.text",
      "ValueError: Vega-Lite charts require a non-empty spec dict."
    );

    cy.getIndexed(".stException .message", 3).should(
      "have.text",
      "ValueError: Vega-Lite charts require a non-empty spec dict."
    );

    cy.getIndexed(".stException .message", 4).should(
      "have.text",
      "TypeError: _legacy_altair_chart() missing 1 required positional argument: 'altair_chart'"
    );
  });
});
