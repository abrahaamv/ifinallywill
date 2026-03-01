import type { TemplateSection } from '../../../lib/template-renderer';

export const sections: TemplateSection[] = [
  {
    id: 'secondaryWill-titleIntro',
    title: `<p style="text-align: center"><strong>SECONDARY LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p>`,
    order: 1,
    fallback: '',
    content: `
 <p><br /><br />
 I, {{personal.fullName}}, presently of {{personal.city}}
 {{#if personal.province}}, {{personal.province}}{{/if}}, declare that this is my Secondary Last Will and Testament
 for all of those shares and loans, advances and other receivables which I may hold at the time of my death in private
 corporations, along with any amounts owing to me by the corporations including declared but unpaid dividends
 (my "Private Assets"), all foreign property and all articles and effects of personal, domestic and household use or ornaments
 owned by me at the time of my death, which are specifically excluded from my primary will, as such are not subject to probate.
 For greater certainty, nothing in this my Will shall revoke or override the Primary Last Will and Testament executed on
 ________________, 20__ (the same day as this Secondary Last Will and Testament) that disposes of all of my assets,
 other than my Private Assets.
 Neither the execution of this will nor the execution of my Primary Last Will and Testament dealing with all of my assets other
 than my Private Assets is intended to revoke the other; they are to operate concurrently.
 <br /><br />
 </p>`,
    keywords: ['personal.fullName', 'personal.city', 'personal.province'],
    children: [],
  },
  {
    id: 'secondaryWill-priorWillsCodicils',
    title: `<p><strong><u>Prior Wills and Codicils</u></strong></p>`,
    order: 2,
    fallback: '',
    content: `<ol>
 <li>I revoke all prior Wills and Codicils.</li>
</ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'secondaryWill-executor',
    title: `<p style="text-align: center"><strong>II. EXECUTOR</strong></p>`,
    order: 3,
    fallback: '',
    content: '',
    keywords: [],
    children: [
      {
        id: 'secondaryWill-executorDefinition',
        title: `<p><strong><u>Definition</u></strong></p>`,
        order: 1,
        fallback: '',
        content: `<ol>
 <li>The expression "my Executor" used throughout this Will includes either the singular or plural number,
 wherever the fact or context so requires. The term "executor" in this Will is synonymous with and includes
 the terms "personal representative" and "executrix".
 </li>
 </ol>`,
        keywords: [],
        children: [],
      },
      {
        id: 'secondaryWill-executorAppointment',
        title: `<p><strong><u>Appointment</u></strong></p>`,
        order: 2,
        fallback: '',
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
        keywords: ['executors', 'relatives', 'kids', 'spouseInfo'],
        children: [],
      },
      {
        id: 'secondaryWill-executorPowers',
        title: `<p><strong><u>Powers of my Executor</u></strong></p>`,
        order: 3,
        fallback: '',
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
 and as free as possible from any court supervision, under the laws of the Province of British Columbia;
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
        keywords: ['trusting', 'minTrustingAge'],
        children: [],
      },
    ],
  },
  {
    id: 'secondaryWill-dispositionOfEstate',
    title: `<p style="text-align: center"><strong>III. DISPOSITION OF PRIVATE ASSETS</strong></p>`,
    order: 4,
    fallback: '',
    content: `{{#if bequests}}
 {{#if_gt bequests.length 0}}
    <p><strong><u>Specific Bequest</u></strong></p>
 <ol>
 <li>
 To receive a specific distribution under this Will a beneficiary must survive me for thirty days.
 Any item that fails to pass to a beneficiary will return to my estate to be included in the residue
 of my estate. All property given under this Will is subject to any encumbrances or liens attached
 to the property. My specific distributions of private assets are as follows:
 </li>
 <ul>
 {{#renderBequests bequests relatives kids spouseInfo}}{{/renderBequests}}
 </ul>
 </ol>
 {{/if_gt}}
{{/if}}

<p><strong><u>Final Distribution</u></strong></p>
<ol>
 <li>To receive any gift or property under this Will a beneficiary must survive me for thirty days.</li>
 <li>Beneficiaries or any alternate beneficiaries of my Private Assets will receive and share all of my property
 and assets not specifically distributed or otherwise required for the payment of any debts owed, including
 but not limited to, expenses associated with the administration of my Will, the payment of taxes, or any other
 expense resulting from the administration of my Will.
 </li>
  <li>All property given under this Will is subject to any encumbrances or liens attached to the property.</li>
  <li>I wish for the residue of my corporate assets to be distributed accordingly.</li>
</ol>`,
    keywords: ['bequests', 'relatives', 'kids', 'spouseInfo'],
    children: [],
  },
  {
    id: 'secondaryWill-respRdsp',
    title: `<p style="text-align: center"><strong>IV. RESP AND RDSP</strong></p>`,
    order: 5,
    fallback: '',
    content: `<ol>
 <li>If my Spouse survives me, my Executor(s) shall appoint my Spouse as the Successor Subscriber of any Registered Education Savings Plan (RESP) and / or Registered Disability Savings Plan (RDSP) of which I am the current Subscriber at the time of my death, and my Spouse shall have all of the rights and obligations associated with being the Subscriber.</li>
 <li>If my Spouse does not survive me or if we are not married at the time of my death, my Executor(s) may appoint a replacement Subscriber for any RESP and / or RDSP of which I am the current Subscriber at the time of my death. The person appointed by my Executor shall have all of the rights and obligations associated with being the Subscriber.</li>
 <li>If the rules governing an RESP and / or RDSP do not permit my Executor(s) to appoint a Successor Subscriber or if my Executor(s) decides not to appoint a replacement Subscriber, the RESP and / or RDSP shall be collapsed and the funds paid out in accordance with the rules governing the plan at the time of my death.</li>
</ol>`,
    keywords: ['spouseInfo'],
    children: [],
  },
  {
    id: 'secondaryWill-testamentaryTrusts',
    title: `<p style="text-align: center"><strong>V. TESTAMENTARY TRUSTS</strong></p>`,
    order: 6,
    fallback: '',
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
 <li>To pay himself or herself compensation as set out in the Trustee Act, R.S.B.C. 1996, c. 464, out of the
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
    keywords: ['trusting', 'minTrustingAge', 'maxTrustingAge'],
    children: [],
  },
  {
    id: 'secondaryWill-digitalAssets',
    title: `<p style="text-align: center"><strong>VI. DIGITAL ASSETS</strong></p>`,
    order: 7,
    fallback: '',
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
    keywords: [],
    children: [],
  },
  {
    id: 'secondaryWill-generalProvisions',
    title: `<p style="text-align: center"><strong>VII. GENERAL PROVISIONS</strong></p>`,
    order: 8,
    fallback: '',
    content: `<p><strong><u>Family Law Act</u></strong></p>
<ol>
 <li>I declare that all property acquired by a person as a result of my death together with any property into which
 such property can be traced, and all income from such property or any property into which such property can be
 traced, including income on such income, shall be excluded from such person&rsquo;s net family property for the
 purposes of Part 5 of the Family Law Act, S.B.C. 2011, c. 25, as amended (the &ldquo;Family Law Act&rdquo;) and
 for the purposes of any provisions in any successor legislation or other legislation in any jurisdiction. For
 the purposes of this paragraph, the term &ldquo;net family property&rdquo; includes any property available for
 division or for satisfying any financial claim, between spouses upon separation, divorce, annulment or death of
 one of them and, for greater certainty, such term includes any net family property within the meaning of the
 Family Law Act. This declaration shall be an express statement within the meaning of section 85(1)(b) of the
 Family Law Act and shall have effect to the extent permitted by that statute, any successor legislation thereto
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
    keywords: [],
    children: [],
  },
  {
    id: 'secondaryWill-signatureExecution',
    title: `<p>&nbsp;</p><p style="text-align: center"><em>The remainder of this page has intentionally been left blank.</em></p>`,
    order: 9,
    fallback: '',
    content: `<p>IN WITNESS WHEREOF, I have signed my name on this the _________ day of ______________________, 20______,
 at {{personal.city}}, {{personal.province}} declaring and publishing this instrument as my Last Will, in the presence of the undersigned
 witnesses, who witnessed and subscribed this Last Will at my request, and in my presence
<br /><br /><br /> _____________________________<br /> {{personal.fullName}} (Testator) Signature<br /> <br /><br /> SIGNED
AND DECLARED by {{personal.fullName}} on this ____ day of ____________________, 20____ to be the Testator&rsquo;s Last Will
and Testament, who at the Testator&rsquo;s request and in the presence of the Testator,
physical presence of each other at _______________________, all being present at the same
time, have signed our names as witnesses in the Testator&rsquo;s presence on the above date. <br /><br /><br />
<br /> <br />Witness #1 ____________________________________<br /><br /> Address:
<br /> ________________________________________________<br />________________________________________________<br /> <br /><br /><br /><br />
Witness #2 ____________________________________<br /><br /> Address:<br />________________________________________________<br />________________________________________________</p> <br /><p style="text-align: center"><strong>LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p><p><br /><br /><br /><br /><br /> <br /><br /><br /><br /><br /><br /> Prepared by: iFinallyWill
Toronto, ON<br /> ifinallywill.com<br /> info@ifinallywill.com<br />
<br /><br /><br /><br />
</p>`,
    keywords: ['personal.fullName', 'personal.city', 'personal.province'],
    children: [],
  },
];
