import type { TemplateSection } from '../../../lib/template-renderer';

export const sections: TemplateSection[] =
[
    {
        id: "primaryWill-titleIntro",
        title: `<p style="text-align: center"><strong> PRIMARY LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p>`,
        order: 1,
        fallback: "",
        content: `
            <p><br /><br />
                I, {{personal.fullName}}, presently of {{personal.city}}
                {{#if personal.province}}, {{personal.province}}{{/if}}, declare that this is my Primary Last Will and Testament
                for all assets, excluding however, all those shares and loans, advances and other receivables which I may hold at the time
                of my death in private corporations along with any amounts owing to me by the corporation including declared but unpaid
                dividends (my "Private Assets"), all foreign property and all articles and effects of personal, domestic and household use
                or ornaments owned by me at the time of my death, which are specifically excluded from this will, and which are addressed
                in my Secondary Last Will and Testament which bears the same date as this my Primary Last Will and Testament.
                It is my intention that the Secondary Last Will and Testament respecting my Private Assets shall not be subject to probate.
                For greater certainty, nothing in this my Will shall revoke or override the Secondary Last Will and Testament executed on
                ________________, 20___ (the same day as this Primary Last Will and Testament) that disposes of my Private Assets.
                Neither the execution of this will nor the execution of my Secondary Last Will and Testament dealing with my Private
                Assets is intended to revoke the other; they are to operate concurrently.
                <br /><br />
            </p>
           `,
        keywords: ["personal.fullName", "personal.city", "personal.province"],
        children: []
    },
    {
        id: "primaryWill-priorWillsCodicils",
        title: `<p><strong><u>Prior Wills and Codicils</u></strong></p>`,
        order: 2,
        fallback: "",
        content: `<ol>
  <li>I revoke all prior Wills and Codicils.</li>
</ol>`,
        keywords: [],
        children: []
    },
    {
        id: "primaryWill-maritalStatus",
        title: `<p><strong><u>Marital Status</u></strong></p>`,
        order: 3,
        fallback: "",
        content: `<ol>
  <li>
    {{#if isMarried}}
      I am married to {{spouseInfo.firstName}} {{spouseInfo.middleName}} {{spouseInfo.lastName}} (my "{{spouseInfo.relative}}").
    {{else if isCommonRelationship}}
      I am in a common law relationship with {{spouseInfo.firstName}} {{spouseInfo.middleName}} {{spouseInfo.lastName}} (my "{{spouseInfo.relative}}").
    {{else}}
      I am not married or in a common law relationship.
    {{/if}}
  </li>
</ol>`,
        keywords: ["isMarried", "isCommonRelationship", "spouseInfo.firstName", "spouseInfo.middleName", "spouseInfo.lastName", "spouseInfo.relative"],
        children: []
    },
    {
        id: "primaryWill-currentChildren",
        title: `<p><strong><u>Current Children</u></strong></p>`,
        order: 4,
        fallback: "",
        content: `<ol>
  {{#if hasKids}}
    <li>I have the following living children: </li>
    <ul>
      {{#each kids}}
        <li>{{this.firstName}} {{this.lastName}}</li>
      {{/each}}
    </ul>
    <li>The term "child" or "children" as used in this my Will includes the above listed children and any children of mine that are subsequently born or legally adopted.</li>
  {{else}}
    <li>I do not currently have any living children</li>
  {{/if}}
</ol>`,
        keywords: ["hasKids", "kids"],
        children: []
    },
    {
        id: "primaryWill-executor",
        title: `<p style="text-align: center"><strong>II. EXECUTOR</strong></p>`,
        order: 5,
        fallback: "",
        content: "",
        keywords: [],
        children: [
            {
                id: "primaryWill-executorDefinition",
                title: `<p><strong><u>Definition</u></strong></p>`,
                order: 1,
                fallback: "",
                content: `<ol>
      <li>The expression "my Executor" used throughout this Will includes either the singular or plural number,
        wherever the fact or context so requires. The term "executor" in this Will is synonymous with and includes
        the terms "personal representative" and "executrix".
      </li>
    </ol>`,
                keywords: [],
                children: []
            },
            {
                id: "primaryWill-executorAppointment",
                title: `<p><strong><u>Appointment</u></strong></p>`,
                order: 2,
                fallback: "",
                content: `<ol>
      {{#if executors.length}}
        {{#groupByPriority executors}}
          {{#eachGroup}}
            <li>
              {{#if_eq @index 0}}
                I appoint
              {{else}}
                If {{#prevGroup}}{{#each this}}{{#findPersonInfo (concat this.firstName " " this.lastName) ../relatives ../kids ../spouseInfo}}{{#isLawFirm this.firstName}}The Managing Lawyer Of {{this.firstName}}{{else}}{{fullName}}{{formatLocation city province country}}{{/isLawFirm}}{{/findPersonInfo}}{{#unless @last}}{{#if_gt ../length 1}} and/or {{else}} and {{/if_gt}}{{/unless}}{{/each}}{{/prevGroup}} cannot act or continue to act as Executor(s), then I appoint
              {{/if_eq}}
              {{#each this}}
                {{#if @index}} and {{/if}}
                {{#findPersonInfo (concat this.firstName " " this.lastName) ../relatives ../kids ../spouseInfo}}
                  {{#isLawFirm this.firstName}}
                    The Managing Lawyer Of {{this.firstName}}
                  {{else}}
                    {{fullName}}{{formatLocation city province country}}
                  {{/isLawFirm}}
                {{/findPersonInfo}}
              {{/each}}
              {{#if_eq @index 0}}
                {{#if_gt this.length 1}}as the JOINT Executor(s){{else}}as the sole Executor(s){{/if_gt}} of this my Will.
              {{else}}
                to be the alternate Executor(s).
              {{/if_eq}}
            </li>
          {{/eachGroup}}
        {{/groupByPriority}}
      {{else}}
        <li>
          I appoint The Managing Lawyer Of iFinallyWill or any successor law firm as the sole Executor of this my Will.
        </li>
      {{/if}}
      <li>No bond or other security of any kind will be required of any Executor appointed in this my Will.</li>
    </ol>`,
                keywords: ["executors", "relatives", "kids", "spouseInfo"],
                children: []
            },
            {
                id: "primaryWill-executorPowers",
                title: `<p><strong><u>Powers of my Executor</u></strong></p>`,
                order: 3,
                fallback: "",
                content: `<ol>
      <li>I give and appoint to my Executor the following duties and powers with respect to my estate:</li>
      <ul>
        <li>
          My Executor(s) shall collect and gather my assets and may sell these assets at a time and price and upon
          such other terms as they consider appropriate in their absolute discretion, and without liability for
          loss or depreciation;
        </li>
        <li>
          To pay my legally enforceable debts, funeral expenses and all expenses in connection with the
          administration of my estate and the trusts created by my Will as soon as convenient after my death. If
          any of the real property devised in my Will remains subject to a mortgage at the time of my death, then
          I direct that the devisee taking that mortgaged property will take the property subject to that mortgage
          and that the devisee will not be entitled to have the mortgage paid out or resolved from the remaining
          assets of the residue of my estate;
        </li>
        <li>
          To take all legal actions to have the probate of my Will completed as quickly and simply as possible,
          and as free as possible from any court supervision, under the laws of the Province of Alberta;
        </li>
        <li>
          To retain, exchange, insure, repair, improve, sell or dispose of any and all personal property belonging
          to my estate as my Executor deems advisable without liability for loss or depreciation;
        </li>
        <li>
          To invest, manage, lease, rent, exchange, mortgage, sell, dispose of or give options without being
          limited as to term and to insure, repair, improve, or add to or otherwise deal with any and all real
          property belonging to my estate as my Executor deems advisable without liability for loss or
          depreciation;
        </li>
        <li>
          To purchase, maintain, convert and liquidate investments or securities, and to vote stock, or exercise
          any option concerning any investments or securities without liability for loss;
        </li>
        <li>To open or close bank accounts;</li>
        <li>
          To maintain, continue, dissolve, change or sell any business which is part of my estate, or to purchase
          any business if deemed necessary or beneficial to my estate by my Executor;
        </li>
        <li>To maintain, settle, abandon, sue or defend, or otherwise deal with any lawsuits against my estate;</li>
        <li>To open, liquidate or dissolve a corporation;</li>
        <li>To conduct post-mortem tax planning;</li>
        <li>To employ any lawyer, accountant or other professional; and</li>
        {{#if trusting}}
          {{#if trusting.0.age}}
            <li>
              Except as otherwise provided in this my Will, to act as my Trustee by holding in trust the share of any
              beneficiary for whom a Testamentary Trust is established pursuant to this Will, and to keep such share
              invested, pay the income or capital or as much of either or both as my Executor considers advisable for
              the maintenance, education, advancement or benefit of such beneficiary and to pay or transfer the
              capital of such share or the amount remaining of that share to such beneficiary reaching the age of {{minTrustingAge}} years
              or, prior to such beneficiary when they reach the age of {{minTrustingAge}} years, to pay or transfer such share to
              any parent or guardian of such beneficiary subject to like conditions and the receipt of any such parent or
              guardian discharges my Executor
            </li>
          {{/if}}
        {{/if}}
        <li>
          When my Executor administers my estate, my Executor may convert my estate or any part of my estate into
          money or any other form of property or security, and decide how, when, and on what terms. My Executor
          may keep my estate, or any part of it, in the form it is in at my death and for as long as my Executor
          decides, even for the duration of the trusts in this Will. This power applies even if the property is
          not an investment authorized under this Will, a debt is owing on the property; or the property does not
          produce income.
        </li>
      </ul>
      <li value="2">
        The above authority and powers granted to my Executor are in addition to any powers and elective rights
        conferred by provincial/territorial or federal law or by other provision of this Will and may be exercised
        as often as required, and without application to or approval by any court.
      </li>
    </ol>`,
                keywords: ["trusting", "minTrustingAge"],
                children: []
            }
        ]
    },
    {
        id: "primaryWill-dispositionOfEstate",
        title: `<p style="text-align: center"><strong>III. DISPOSITION OF ESTATE</strong></p>`,
        order: 6,
        fallback: "",
        content: `{{#if bequests}}
  {{#if_gt bequests.length 0}}
    <p><strong><u>Bequests</u></strong></p>
    <ol>
      <li>
        To receive a specific bequest under this Will a beneficiary must survive me for thirty days.
        Any item that fails to pass to a beneficiary will return to my estate to be included in the residue
        of my estate. All property given under this Will is subject to any encumbrances or liens attached
        to the property. My specific bequests are as follows:
      </li>
      <ul>
        {{#renderBequests bequests relatives kids spouseInfo}}{{/renderBequests}}
      </ul>
    </ol>
  {{/if_gt}}
{{/if}}

<p><strong><u>Distribution of Residue</u></strong></p>
<ol>
  <li>To receive any gift or property under this Will a beneficiary must survive me for thirty days.</li>
  <li>Beneficiaries or any alternate beneficiaries of my estate residue will receive and share all of my property
      and assets not specifically bequeathed or otherwise required for the payment of any debts owed, including
      but not limited to, expenses associated with the probate of my Will, the payment of taxes, funeral expenses
      or any other expense resulting from the administration of my Will.
  </li>
  <li>The entire estate residue is to be divided between my designated beneficiaries or any alternate beneficiaries with the beneficiaries or any alternate beneficiaries receiving a part of the entire estate residue.</li>

  {{#if_eq residueInfo.selected "Specific Beneficiaries"}}
    <li>The entire estate residue is to be divided between my designated beneficiaries or any alternate beneficiaries as follows:</li>
    <ul>
      {{#each residueInfo.beneficiary}}
  <li>
    {{#if this.isOrganization}}
      Organization: {{this.beneficiary}} - {{this.shares}} share(s)
    {{else}}
      {{#findPersonInfo this.beneficiary ../relatives ../kids ../spouseInfo}}
        Beneficiary: {{fullName}} <!-- CHANGED: was {{beneficiary}} -->
        {{#if city}} of {{city}}, {{country}}{{/if}}
        - {{../shares}} share(s)
        {{#if ../backup}}
          {{#if_neq ../backup "NA"}}
            , if {{fullName}} predeceases me, then I give the residue of my estate to {{../backup}}
            {{#findPersonInfo ../backup ../../relatives ../../kids ../../spouseInfo}}
              {{#if city}} of {{city}}, {{country}}{{/if}}
            {{/findPersonInfo}}
            {{#if ../type}}, Type: {{../type}}{{/if}}
          {{/if_neq}}
        {{/if}}
      {{/findPersonInfo}}
    {{/if}}
  </li>
{{/each}}
    </ul>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Custom Clause"}}
    <li>The residue of my estate shall be distributed in accordance with the following custom clause:</li>
    <blockquote>"{{residueInfo.clause}}"</blockquote>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue go to parents then siblings per stirpes"}}
    <li>The residue of my estate shall go to my parents, and if they predecease me, to my siblings per stirpes, ensuring each line of descent receives an equal portion.</li>
    <li>If any of my siblings predecease me, their share shall be divided equally among their surviving descendants.</li>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue go to siblings per stirpes"}}
    <li>The residue of my estate shall be distributed to my siblings per stirpes, with each line of descent receiving an equal share.</li>
    <li>If any of my siblings predecease me, their share shall be divided among their surviving descendants in equal portions.</li>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue go to children per stirpes"}}
    <li>The residue of my estate shall be distributed among my children per stirpes, where each line of descent receives an equal portion of the estate.</li>
    <li>If any of my children predecease me, their share shall be passed equally to their surviving descendants.</li>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue go to children per capita"}}
    <li>The residue of my estate shall be distributed among my children per capita, with each child receiving an equal share.</li>
    <li>If any of my children predecease me, their portion shall be equally divided among the surviving children.</li>
    <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue of my estate to go to my spouse first, then my children equally per stirpes"}}
    <li>The residue of my estate shall first be distributed to my spouse. In the event that my spouse predeceases me or is otherwise unable to inherit, the residue of my estate shall be distributed equally among my children per stirpes, ensuring that each line of descent receives an equal portion.</li>
    <li>If any of my children predecease me, their share shall be divided equally among their surviving descendants.</li>
    <li>All property distributed under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}

  {{#if_eq residueInfo.selected "Have the residue of my estate to go to my spouse first, then my children equally per capita"}}
    <li>The residue of my estate shall first be distributed to my spouse. In the event that my spouse predeceases me or is otherwise unable to inherit, the residue of my estate shall be distributed equally among my children per capita, without regard to the line of descent.</li>
    <li>If any of my children predecease me, their portion shall be equally divided among the surviving children.</li>
    <li>All property distributed under this Will is subject to any encumbrances or liens attached to the property.</li>
  {{/if_eq}}
</ol>`,
        keywords: ["bequests", "relatives", "kids", "spouseInfo", "residueInfo"],
        children: []
    },
    {
        id: "primaryWill-wipeoutProvision",
        title: `<p><strong><u>Wipeout Provision</u></strong></p>`,
        order: 7,
        fallback: "",
        content: `<ol>
  <li>Should all my named beneficiaries and alternate beneficiaries predecease me or fail to survive me for thirty
      full days, or should they all die before becoming entitled to receive the whole of their share of my estate,
      then I direct my Executor to divide any remaining residue of my estate into equal shares as outlined below
      and to pay and transfer such shares to the following wipeout beneficiaries:
  </li>
  <ul>
    {{#if wipeoutInfo}}
      {{#if wipeoutInfo.table_dataBequest}}
        {{#if_gt wipeoutInfo.table_dataBequest.length 0}}
          {{#each wipeoutInfo.table_dataBequest}}
            <li>
              I leave {{this.shares}} shares of the residue of my estate to {{this.beneficiary}}
              {{#findPersonInfo this.beneficiary ../relatives ../kids ../spouseInfo}}
                {{#if city}}of {{city}}, {{country}}{{/if}}
              {{/findPersonInfo}}
              if they shall survive me, for their own use absolutely.
              {{#if this.backup}}
                {{#if_neq this.backup "N/A"}}
                  If {{this.beneficiary}} should not survive me for thirty full days, or die
                  before becoming entitled to receive the whole of their share of the residue of my estate, I leave
                  this share of the residue to {{this.backup}}
                  {{#findPersonInfo this.backup ../relatives ../kids ../spouseInfo}}
                    {{#if city}} of {{city}}, {{country}}{{/if}}
                  {{/findPersonInfo}}
                  {{#if this.type}}
                    {{#if_neq this.type "N/A"}}, {{this.type}}{{/if_neq}}
                  {{/if}}
                  for their own use absolutely.
                {{/if_neq}}
              {{/if}}
            </li>
          {{/each}}
        {{else}}
          <!-- Show category selections when no table data -->
          {{#if wipeoutInfo.selectedCategory}}
            {{#if_eq wipeoutInfo.selectedCategory "100% to parents and siblings"}}
              <li>
                In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 100% of the residue of my estate
                shall be distributed to my parents, and if they are no longer living, then to my siblings in equal shares.
              </li>
            {{/if_eq}}
            {{#if_eq wipeoutInfo.selectedCategory "100% to siblings"}}
              <li>
                In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 100% of the residue of my estate
                shall be distributed to my siblings in equal shares.
              </li>
            {{/if_eq}}
            {{#if_eq wipeoutInfo.selectedCategory "50% to parents and siblings and 50% to parents and siblings of spouse"}}
              <li>
                In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 50% of the residue of my estate
                shall be distributed to my parents and siblings in equal shares, and 50% shall be distributed to the parents and
                siblings of my spouse in equal shares.
              </li>
            {{/if_eq}}
            {{#if_eq wipeoutInfo.selectedCategory "50% to siblings and 50% to siblings of spouse"}}
              <li>
                In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 50% of the residue of my estate
                shall be distributed to my siblings in equal shares, and 50% shall be distributed to the siblings of my spouse
                in equal shares.
              </li>
            {{/if_eq}}
          {{/if}}
        {{/if_gt}}
      {{else}}
        <!-- Show category selections when no table_dataBequest property -->
        {{#if wipeoutInfo.selectedCategory}}
          {{#if_eq wipeoutInfo.selectedCategory "100% to parents and siblings"}}
            <li>
              In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 100% of the residue of my estate
              shall be distributed to my parents, and if they are no longer living, then to my siblings in equal shares.
            </li>
          {{/if_eq}}
          {{#if_eq wipeoutInfo.selectedCategory "100% to siblings"}}
            <li>
              In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 100% of the residue of my estate
              shall be distributed to my siblings in equal shares.
            </li>
          {{/if_eq}}
          {{#if_eq wipeoutInfo.selectedCategory "50% to parents and siblings and 50% to parents and siblings of spouse"}}
            <li>
              In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 50% of the residue of my estate
              shall be distributed to my parents and siblings in equal shares, and 50% shall be distributed to the parents and
              siblings of my spouse in equal shares.
            </li>
          {{/if_eq}}
          {{#if_eq wipeoutInfo.selectedCategory "50% to siblings and 50% to siblings of spouse"}}
            <li>
              In the absence of surviving beneficiaries or alternate beneficiaries, I direct that 50% of the residue of my estate
              shall be distributed to my siblings in equal shares, and 50% shall be distributed to the siblings of my spouse
              in equal shares.
            </li>
          {{/if_eq}}
        {{/if}}
      {{/if}}
    {{/if}}
  </ul>
</ol>`,
        keywords: ["wipeoutInfo", "relatives", "kids", "spouseInfo"],
        children: []
    },
    {
        id: "primaryWill-children",
        title: `{{#if hasKids}}{{#if_gt guardians.length 0}}<p style="text-align: center"><strong>IV. CHILDREN</strong></p>{{/if_gt}}{{/if}}`,
        order: 8,
        fallback: "",
        content: `{{#if hasKids}}
  {{#if_gt guardians.length 0}}
    <p><strong><u>Guardian for Minor and Dependent Children</u></strong></p>
    <ol>
      {{#groupByPosition guardians}}
        {{#eachGroup}}
          <li>
            {{#if_eq @index 0}}
              Should my minor or dependent children require a guardian to care for them, I appoint
            {{else}}
              If {{#prevGroup}}{{#each this}}{{#findPersonInfo this.guardian ../relatives ../kids ../spouseInfo}}{{fullName}}{{formatLocation city province country}}{{/findPersonInfo}}{{#unless @last}}{{#if_gt ../length 1}} and/or {{else}} and {{/if_gt}}{{/unless}}{{/each}}{{/prevGroup}} cannot act or continue to act as Guardians, I appoint
            {{/if_eq}}
            {{#each this}}
              {{#if @index}} and {{/if}}
              {{#findPersonInfo this.guardian ../relatives ../kids ../spouseInfo}}
                {{fullName}}{{formatLocation city province country}}
              {{/findPersonInfo}}
            {{/each}}
            {{#if_eq @index 0}}
              to be the sole Guardian(s) of all my minor and dependent children until they reach the age of majority.
            {{else}}
              to be the alternate Guardian(s).
            {{/if_eq}}
          </li>
        {{/eachGroup}}
      {{/groupByPosition}}
    </ol>
  {{/if_gt}}
{{/if}}`,
        keywords: ["hasKids", "guardians", "relatives", "kids", "spouseInfo"],
        children: []
    },
    {
        id: "primaryWill-respRdsp",
        title: `{{#if hasKids}}{{#if_gt guardians.length 0}}<p style="text-align: center"><strong>V. RESP AND RDSP</strong></p>{{else}}<p style="text-align: center"><strong>IV. RESP AND RDSP</strong></p>{{/if_gt}}{{else}}<p style="text-align: center"><strong>IV. RESP AND RDSP</strong></p>{{/if}}`,
        order: 9,
        fallback: "",
        content: `<ol>
  <li>If my Spouse survives me, my Executor(s) shall appoint my Spouse as the Successor Subscriber of any Registered Education Savings Plan (RESP) and / or Registered Disability Savings Plan (RDSP) of which I may be the sole subscriber at the time of my death.</li>
  <li>In the event that my Spouse has predeceased me, my Executor(s) shall appoint, as Successor Subscriber, a parent of the beneficiary(ies), Guardian for Property of the beneficiary(ies), person standing in the place of a parent of the beneficiary(ies) or to any other person, including the beneficiary(ies), which my Executor(s), in their sole discretion, considers to be a proper Successor Subscriber.</li>
  <li>The appointment by my Executor of a Successor Subscriber shall constitute a full and sufficient release to my Executor who shall not be obliged to see to the maintenance of the RESP and/or RDSP.</li>
  <li>Without limiting the foregoing, it is my wish that such Successor Subscriber shall take such steps as are necessary in order for the RESP to be maintained by them as the Successor Subscriber until such time as the beneficiary(ies) of the said RESP and / or RDSP qualify or may qualify for educational assistance payments (as such term is defined in the Income Tax Act).</li>
</ol>`,
        keywords: ["spouseInfo"],
        children: []
    },
    {
        id: "primaryWill-testamentaryTrusts",
        title: `<p style="text-align: center"><strong>{{#if hasKids}}{{#if_gt guardians.length 0}}VI{{else}}V{{/if_gt}}{{else}}V{{/if}} TESTAMENTARY TRUSTS</strong></p>`,
        order: 10,
        fallback: "",
        content: `<p><strong><u>Testamentary Trust for Young Beneficiaries</u></strong></p>
<ol>
  {{#if trusting}}
    {{#if trusting.0.age}}
      <li>
        It is my intent to create a testamentary trust (a "Testamentary Trust") for each beneficiary who has not yet
        reached the age of {{minTrustingAge}} at the time of my death (a "Young Beneficiary"). I name my Executor(s) as trustee (the
        "Trustee") of any and all Testamentary Trusts required in this my Will. Any assets bequeathed, transferred, or
        gifted to a Young Beneficiary are to be held in a separate trust by the Trustee until that Young Beneficiary
        reaches the designated age. Any property left by me to any Young Beneficiary in this my Will shall be given to
        my Executor(s) to be managed until that Young Beneficiary reaches the following ages, at which time they will
        receive that designated percentage of their inheritance:
      </li>
      <ul>
        {{#each trusting}}
          {{#if this.age}}
            <li>When they reach the age of {{this.age}} years, {{this.shares}}% of the total share will be paid or transferred to the beneficiary.</li>
          {{/if}}
        {{/each}}
      </ul>
      <li>
        At the age of {{maxTrustingAge}} each beneficiary will receive their last payment, plus any other amounts then still remaining in trust for them.
        If prior to reaching these ages, the share may be paid or transferred to any parent or guardian of such beneficiary subject to like conditions and the receipt of any such parent or guardian discharges my Executor.
      </li>
    {{else}}
      <li>
        It is my intent to create a testamentary trust (a "Testamentary Trust") for each beneficiary who has not yet reached the age of the age of majority at the time of my death (a "Young Beneficiary"). I name my Executor(s) as trustee (the "Trustee") of any and all Testamentary Trusts required in this my Will. Any assets bequeathed, transferred, or gifted to a Young Beneficiary are to be held in a separate trust by the Trustee until that Young Beneficiary reaches the designated age. Any property left by me to any Young Beneficiary in this my Will shall be given to my Executor(s) to be managed until that Young Beneficiary reaches the following ages, at which time they will receive that designated percentage of their inheritance.
      </li>
      <li>Each Young Beneficiary shall receive 100% of their inheritance at the age of majority
      </li>
    {{/if}}
  {{else}}
    <li>
      It is my intent to create a testamentary trust (a "Testamentary Trust") for each beneficiary who has not yet reached the age of the age of majority at the time of my death (a "Young Beneficiary"). I name my Executor(s) as trustee (the "Trustee") of any and all Testamentary Trusts required in this my Will. Any assets bequeathed, transferred, or gifted to a Young Beneficiary are to be held in a separate trust by the Trustee until that Young Beneficiary reaches the designated age. Any property left by me to any Young Beneficiary in this my Will shall be given to my Executor(s) to be managed until that Young Beneficiary reaches the following ages, at which time they will receive that designated percentage of their inheritance.
      </li>
      <li>Each Young Beneficiary shall receive 100% of their inheritance at the age of majority
    </li>
  {{/if}}
</ol>

<p><strong><u>Testamentary Trust for Disabled Beneficiaries</u></strong></p>
<ol>
  <li>It is my intent to create a testamentary trust (a "Testamentary Trust") for each beneficiary who is temporarily
      or permanently disabled at the time of my death (a "Disabled Beneficiary"). Any assets bequeathed, transferred,
      or gifted to a Disabled Beneficiary are to be held in a separate trust by the Trustee until that Disabled
      Beneficiary regains the capacity to manage property (in the case of a temporary incapacity) or on a permanent
      basis if the incapacity is permanent. The property shall be managed, invested, or transferred to a Henson Trust
      at the absolute discretion of my Executor(s).</li>
</ol>

<p><strong><u>Trust Administration</u></strong></p>
<ol>
  <li>The Trustee shall manage the Testamentary Trust for Young Beneficiaries as follows:</li>
  {{#if trusting}}
    {{#if trusting.0.age}}
      <ul>
        <li>The assets and property will be managed for the benefit of the Young Beneficiary until the beneficiary
            reaches the age set by me for final distribution;</li>
        <li>Upon the Young Beneficiary reaching the age set by me for final distribution, all property and assets
            remaining in the trust will be transferred to the beneficiary as quickly as possible; and</li>
        <li>Until the Young Beneficiary reaches the age set by me for final distribution, my Trustee will keep the
            assets of the trust invested and pay the whole or such part of the net income derived therefrom and any
            amount or amounts out of the capital that my Trustee may deem advisable to or for the support, health,
            maintenance, education, or benefit of that beneficiary.</li>
      </ul>
    {{/if}}
  {{/if}}
  <ul>
    <li>The Trustee may, in the Trustee's discretion, invest and reinvest trust funds in any kind of real or personal
        property and any kind of investment, provided that the Trustee acts with the care, skill, prudence and
        diligence, considering all financial and economic considerations, that a prudent person acting in a similar
        capacity and familiar with such matters would use.</li>
    <li>No bond or other security of any kind will be required of any Trustee appointed in this my Will.</li>
  </ul>
</ol>


<p><strong><u>Trust Termination</u></strong></p>

<ol>
  <li>The Testamentary Trust will end after any of the following:</li>

  <ul>
    {{#if trusting}}
      {{#if trusting.0.age}}
        <li>The beneficiary reaching the age set by me for final distribution;</li>
      {{/if}}
    {{/if}}
    <li>The beneficiary dies; or</li>
    <li>The assets of the trust are exhausted through distributions.</li>
  </ul>
</ol>

<p><strong><u>Powers of Trustee</u></strong></p>
<ol>
  <li>To carry out the terms of my Will, I give my Trustee the following powers to be used in his or her discretion at
      any time in the management of a trust created hereunder, namely:</li>

  <ol>
    <li>The power to make such expenditures as are necessary to carry out the purpose of the trust;</li>
    <li>Subject to my express direction to the contrary, the power to sell, call in and convert into money any
        trust property, including real property, that my Trustee in his or her discretion deems advisable;</li>
    <li>Subject to my express direction to the contrary, the power to mortgage trust property where my Trustee
        considers it advisable to do so;</li>
    <li>Subject to my express direction to the contrary, the power to borrow money where my Trustee considers it
        advisable to do so;</li>
    <li>Subject to my express direction to the contrary, the power to lend money to the trust beneficiary if my
        Trustee considers it is in the best interest of the beneficiary to do so;</li>
    <li>To make expenditures for the purpose of repairing, improving and rebuilding any property;</li>
    <li>To exercise all rights and options of an owner of any securities held in trust;</li>
    <li>To lease trust property, including real estate, without being limited as to term;</li>
    <li>To make investments they consider advisable, without being limited to those investments authorized by
        law for trustees;</li>
    <li>To receive additional property from any source and in any form of ownership;</li>
    <li>Instead of acting personally, to employ and pay any other person or persons, including a body corporate,
        to transact any business or to do any act of any nature in relation to a trust created under my Will
        including the receipt and payment of money, without being liable for any loss incurred. And I authorize
        my Trustee to appoint from time to time upon such terms as they may think fit any person or persons,
        including a body corporate, for the purpose of exercising any powers herein expressly or impliedly given
        to my Trustee with respect to any property belonging to the trust;</li>
    <li>Without the consent of any persons interested in trusts established hereunder, to compromise, settle or
        waive any claim or claims at any time due to or by the trust in such manner and to such extent as my
        Trustee considers to be in the best interest of the trust beneficiary, and to make an agreement with any
        other person, persons or corporation in respect thereof, which shall be binding upon such beneficiary;
    </li>
    <li>To make or not make any election, determination, designation or allocation required or permitted to be
        made by my Trustee (either alone or jointly with others) under any of the provisions of any municipal,
        provincial/territorial, federal, or other taxing statute, in such manner as my Trustee, in his or her
        absolute discretion, deems advisable, and each such election, determination, designation or allocation
        when so made shall be final and binding upon all persons concerned;</li>
    <li>To pay himself or herself compensation as set out in the Trustee Act, R.S.A. 2000, c. T-8, out of the
        trust assets; and</li>
    <li>To employ and rely on the advice given by any attorney, accountant, investment advisor, or other agent
        to assist the Trustee in the administration of this trust and to compensate them from the trust assets.
    </li>
  </ol>

  <li>The above authority and powers granted to my Trustee are in addition to any powers and elective rights conferred
      by statute or federal law or by other provision of this Will and may be exercised as often as required, and
      without application to or approval by any court.</li>
</ol>

<p><strong><u>Other Trust Provisions</u></strong></p>
<ol>
  <li>The expression "my Trustee" used throughout this Will includes either the singular or plural number, as
      appropriate wherever the fact or context so requires.</li>
  <li>Subject to the terms of this my Will, I direct that my Trustee will not be liable for any loss to my estate or
      to any beneficiary resulting from the exercise by him or her in good faith of any discretion given him or her in
      this my Will;</li>
  <li>Any trust created in this Will shall be administered as independently of court supervision as possible under the
      laws of the Province / Territory having jurisdiction over the trust; and</li>
  <li>If any trust condition is held invalid, it will not affect other provisions that can be given effect without the
      invalid provision.</li>
</ol>`,
        keywords: ["trusting", "minTrustingAge", "maxTrustingAge"],
        children: []
    },
    {
        id: "primaryWill-digitalAssets",
        title: `<p style="text-align: center"><strong>{{#if hasKids}}{{#if_gt guardians.length 0}}VII{{else}}VI{{/if_gt}}{{else}}VI{{/if}}. DIGITAL ASSETS</strong></p>`,
        order: 11,
        fallback: "",
        content: `<ol>
  <li>My Executor(s) may access, handle, distribute, and dispose of my digital assets, and may obtain, access, modify,
      delete, and control my passwords and other electronic credentials associated with my digital devices and digital
      assets.</li>
  <li>My Executor(s) may engage contractors or agents to assist my Executor(s) in accessing, handling, distributing,
      and disposing of my digital assets.</li>
  <li>If I have prepared a memorandum, which may be altered by me from time to time, with instructions concerning my
      digital assets and their access, handling, distribution, and disposition, it is my wish that my Executor(s) and
      beneficiaries follow my instructions as outlined in that memorandum.</li>
  <li>For the purpose of my Will, &ldquo;digital assets&rdquo; includes the following: Files stored on my digital
      devices, including but not limited to, desktops, laptops, tablets, peripherals, storage devices, mobile
      telephones, smartphones, and any similar digital device as well as emails, email accounts, digital music,
      digital photographs, digital videos, software licenses, social network accounts, file sharing accounts,
      financial accounts, banking accounts, domain registrations, DNS service accounts, web hosting accounts, tax
      items, regardless of the ownership of any physical device upon which the digital item is stored.</li>
</ol>`,
        keywords: ["hasKids", "guardians"],
        children: []
    },
    {
        id: "primaryWill-generalProvisions",
        title: `<p style="text-align: center"><strong>{{#if hasKids}}{{#if_gt guardians.length 0}}VIII{{else}}VII{{/if_gt}}{{else}}VII{{/if}}. GENERAL PROVISIONS</strong></p>`,
        order: 12,
        fallback: "",
        content: `{{#if pets}}
  {{#if_gt pets.length 0}}
    <p><strong><u>Pets</u></strong></p>
    <ol>
      {{#each pets}}
        <li>
          Where I leave my pet {{this.petName}} which is healthy, I appoint {{this.guardian}}{{#findPersonInfo this.guardian ../relatives ../kids ../spouseInfo}}{{formatLocation city province country}}{{/findPersonInfo}} to be the caretaker,
          to care of it as it's own with all the rights and responsibilities of ownership.

          {{#if this.backup}}
            {{#if_neq this.backup "N/A"}}
              <ul>
                If {{this.guardian}} should refuse or be unable to act or continue to act as {{this.petName}}'s guardian, then I
                appoint {{this.backup}}{{#findPersonInfo this.backup ../relatives ../kids ../spouseInfo}}{{formatLocation city province country}}{{/findPersonInfo}} to act as it's guardian.
              </ul>
            {{/if_neq}}
          {{/if}}
          {{#if this.numericAmount}}
            {{#if_gt this.numericAmount 0}}
              <ul>
                I direct my Executor to provide a maximum of $ {{ this.numericAmount }} ({{#if this.amountCurrency}}{{this.amountCurrency}}{{else}}CAD{{/if}})
                out of the residue of my estate to the pet caretaker as a one-time only sum to be used
                for the future care, feeding and maintenance of my pet {{this.petName}}.
              </ul>
            {{/if_gt}}
          {{/if}}
        </li>
      {{/each}}
      <li>
        Where any appointed caretaker cannot afford or refuses to accept the responsibilities of ownership for any pet
        of mine then I give my Executor the fullest possible discretion in the placement of that pet in an alternate
        permanent, safe and loving environment as soon as possible.
      </li>
    </ol>
  {{/if_gt}}
{{/if}}

<p><strong><u>Matrimonial Property Act</u></strong></p>
<ol>
  <li>I declare that all property acquired by a person as a result of my death together with any property into which
      such property can be traced, and all income from such property or any property into which such property can be
      traced, including income on such income, shall be excluded from such person&rsquo;s net family property for the
      purposes of Part I of the Matrimonial Property Act, R.S.A. 2000, c. M-8, as amended (the &ldquo;Matrimonial Property Act&rdquo;) and
      for the purposes of any provisions in any successor legislation or other legislation in any jurisdiction. For
      the purposes of this paragraph, the term &ldquo;net family property&rdquo; includes any property available for
      division or for satisfying any financial claim, between spouses upon separation, divorce, annulment or death of
      one of them and, for greater certainty, such term includes any net family property within the meaning of the
      Matrimonial Property Act. This declaration shall be an express statement within the meaning of paragraph 7(2)b of the
      Matrimonial Property Act and shall have effect to the extent permitted by that statute, any successor legislation thereto
      or any legislation in any jurisdiction.</li>
</ol>

<p><strong><u>Individuals Omitted from Bequests</u></strong></p>
<ol>
  <li>If I have omitted to leave property in this Will to one or more of my heirs as named above or have provided them
      with zero shares of a bequest, the failure to do so is intentional.</li>
</ol>

<p><strong><u>Insufficient Estate</u></strong></p>
<ol>
  <li>If the value of my estate is insufficient to fulfill all of the bequests described in this Will, then I give my
      Executor full authority to decrease each bequest by a proportionate amount.</li>
</ol>

{{#if additionalInfo}}
  {{#if_or additionalInfo.otherWishes additionalInfo.finalRestingPlace additionalInfo.customClauseText}}
    <p><strong><u>Additional Provisions</u></strong></p>
    <ol>
      {{#if additionalInfo.otherWishes}}
        {{#if_gt additionalInfo.otherWishes.length 0}}
          {{#each additionalInfo.otherWishes}}
            <li>{{this}}</li>
          {{/each}}
        {{/if_gt}}
      {{/if}}

      {{#if additionalInfo.finalRestingPlace}}
        {{#if_eq additionalInfo.finalRestingPlace "cremation"}}
          <li>I wish to be cremated.</li>
        {{/if_eq}}
        {{#if_eq additionalInfo.finalRestingPlace "burial"}}
          <li>I wish to be buried.</li>
        {{/if_eq}}
        {{#if_eq additionalInfo.finalRestingPlace "mausoleum"}}
          <li>I wish to be entombed in a mausoleum.</li>
        {{/if_eq}}
        {{#if_eq additionalInfo.finalRestingPlace "donate"}}
          <li>I wish to donate my body to science.</li>
        {{/if_eq}}
        {{#if_eq additionalInfo.finalRestingPlace "green"}}
          <li>I wish to have a green burial.</li>
        {{/if_eq}}
        {{#if_eq additionalInfo.finalRestingPlace "family"}}
          <li>I wish to have my family determine my final resting place.</li>
        {{/if_eq}}
      {{/if}}

      {{#if additionalInfo.customClauseText}}
        <li>{{additionalInfo.customClauseText}}</li>
      {{/if}}
    </ol>
  {{/if_or}}
{{/if}}

<p><strong><u>No Contest Provision</u></strong></p>
<ol>
  <li>If any beneficiary under this Will contests in any court any of the provisions of this Will, then each and all
      such persons shall not be entitled to any devises, legacies, bequests, or benefits under this Will or any
      codicil hereto, and such interest or share in my estate shall be disposed of as if that contesting beneficiary
      had not survived me.
  </li>
</ol>

<p><strong><u>Severability</u></strong></p>
<ol>
  <li>If any provisions of this Will are deemed unenforceable, the remaining provisions will remain in full force and
      effect.</li>
</ol>`,
        keywords: ["pets", "relatives", "kids", "spouseInfo", "additionalInfo", "hasKids", "guardians"],
        children: []
    },
    {
        id: "primaryWill-signatureExecution",
        title: `<p>&nbsp;</p><p style="text-align: center"><em>The remainder of this page has intentionally been left blank.</em></p>`,
        order: 13,
        fallback: "",
content: `<p>IN WITNESS WHEREOF, I have signed my name on this the _________ day of ______________________, 20______,
  at {{personal.city}}, {{personal.province}} declaring and publishing this instrument as my Last Will, in the presence of the undersigned
  witnesses, who witnessed and subscribed this Last Will at my request, and in my presence, .
<br /><br /><br /> _____________________________<br /> {{personal.fullName}} (Testator) Signature<br /> <br /><br /> SIGNED
AND DECLARED by {{personal.fullName}} on this ____ day of ____________________, 20____ to be the Testator&rsquo;s Last Will
and Testament,  who at the Testator&rsquo;s request and in the presence of the Testator,
 and in the physical presence of each other at _______________________, all being present at the same
time, have signed our names as witnesses in the Testator&rsquo;s presence on the above date. <br /><br /><br />
<br /> <br />Witness #1 ____________________________________<br /><br /> Address:
<br /> ________________________________________________<br />________________________________________________<br /> <br /><br /><br /><br />
Witness #2 ____________________________________<br /><br /> Address:<br />________________________________________________<br />________________________________________________</p> <br /><p style="text-align: center"><strong>LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p><p><br /><br /><br /><br /><br /> <br /><br /><br /><br /><br /><br /> Prepared by: iFinallyWill
Toronto, ON<br /> ifinallywill.com<br /> info@ifinallywill.com<br />
<br /><br /><br /><br />
</p>`,
        keywords: ["personal.fullName", "personal.city", "personal.province"],
        children: []
    }
]
;
