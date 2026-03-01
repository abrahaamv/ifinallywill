import type { TemplateSection } from '../../../lib/template-renderer';

export const sections: TemplateSection[] = [
  {
    id: 'poaHealth-titleHeader',
    title: `<h2 class='document-header'>Personal Directive of {{personal.fullName}}</h2><br />`,
    order: 1,
    fallback: '',
    content: `<p><strong>PERSONAL DIRECTIVE OF {{personal.fullName}}</strong></p>`,
    keywords: ['personal.fullName'],
    children: [],
  },
  {
    id: 'poaHealth-introduction',
    title: '',
    order: 2,
    fallback: '',
    content: `<p>
      I, {{personal.fullName}} (the "Grantor") of {{personal.city}}, {{personal.province}}, being of sound mind and at least 16 years of age, make this Personal Directive fully understanding the consequences of my action in doing so. I intend this Personal Directive to be read by my health care providers, family and friends as a true reflection of my wishes and instructions should I lack Capacity and be unable to communicate such wishes and instructions.
    </p>`,
    keywords: ['personal.fullName', 'personal.city', 'personal.province'],
    children: [],
  },
  {
    id: 'poaHealth-definitions',
    title: `<p><strong>Definitions</strong></p>`,
    order: 3,
    fallback: '',
    content: `<ol>
      <li>
        As used in this document:
        <ul>
          <li>"Act" means the Alberta Personal Directive Act 2000, c. P-6.</li>
          <li>"Assessor" means a person who is designated by the regulations to the Act as being qualified to
              do assessments of Capacity.</li>
          <li>"Capacity" means the person is able to understand information that is relevant to making a
              decision concerning his or her own health care, nutrition, shelter, clothing, hygiene or safety, and
              is able to appreciate the reasonably foreseeable consequences of a decision or lack of decision.</li>
        </ul>
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-revocation',
    title: `<p><strong>Revoke Previous Personal Directive</strong></p>`,
    order: 4,
    fallback: '',
    content: `<ol start="2">
      <li>I revoke any previous Personal Directive made by me.</li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-designation',
    title: `<p><strong>Designation of Attorney</strong></p>`,
    order: 5,
    fallback: '',
    content: `<ol start="3">
      <li>
        I designate {{#if (eq attorneyOne.relation "Spouse")}}my spouse {{attorneyOne.fullName}}{{else}}{{attorneyOne.fullName}}{{/if}}
        {{#if attorneyOne.city}}{{#if attorneyOne.province}}, of {{attorneyOne.city}}, {{attorneyOne.province}}{{#if attorneyOne.country}}, {{attorneyOne.country}}{{/if}}{{/if}}{{/if}}{{#if attorneyJoint.fullName}} and {{attorneyJoint.fullName}}{{#if attorneyJoint.city}}{{#if attorneyJoint.province}}, of {{attorneyJoint.city}}, {{attorneyJoint.province}}{{#if attorneyJoint.country}}, {{attorneyJoint.country}}{{/if}}{{/if}}{{/if}} to be my JOINT Attorney(s){{else}} to be my sole Attorney(s){{/if}} for
        Personal Care (my "Attorney(s)").
      </li>

      {{#if attorneyTwo.length}}
        {{#with attorneyTwo.[0]}}
          <li>
            If {{#if (eq ../attorneyOne.relation "Spouse")}}my spouse {{../attorneyOne.fullName}}{{else}}{{../attorneyOne.fullName}}{{/if}}{{#if ../attorneyJoint.fullName}} and/or {{../attorneyJoint.fullName}}{{/if}} cannot or will not be my Attorney(s) because of refusal, resignation, death, mental incapacity, or removal by the court, I SUBSTITUTE {{fullName}}
            {{#if city}}of {{city}}{{/if}}{{#if province}}, {{province}}{{/if}}{{#if country}}, {{country}}{{/if}} to be my sole Attorney(s).
          </li>
        {{/with}}

        {{#each attorneyTwo}}
          {{#if @index}}
            <li>
              {{#with (lookup ../attorneyTwo (subtract @index 1))}}
              If {{fullName}} cannot or will not be my Attorney(s) because of refusal, resignation, death, mental incapacity, or removal by the court,
              {{/with}}
              I SUBSTITUTE {{fullName}}
              {{#if city}}of {{city}}{{/if}}{{#if province}}, {{province}}{{/if}}{{#if country}}, {{country}}{{/if}} to be my sole Attorney(s).
            </li>
          {{/if}}
        {{/each}}
      {{/if}}
    </ol>`,
    keywords: [
      'attorneyOne.relation',
      'attorneyOne.fullName',
      'attorneyOne.city',
      'attorneyOne.province',
      'attorneyOne.country',
      'attorneyTwo',
    ],
    children: [],
  },
  {
    id: 'poaHealth-duties',
    title: `<p><strong>Duties and Authority of Attorney</strong></p>`,
    order: 6,
    fallback: '',
    content: `<ol start="4">
      <li>
        Where I do not have Capacity to make decisions for myself, I give my Attorney full authority to make
        Personal Care decisions, major health care decisions, and minor health care decisions on my behalf.
      </li>
      <li>
        Notwithstanding any instructions contained in this Personal Directive, my Attorney
        taking into consideration all my wishes may make a decision that conflicts with any of those instructions
        and my Attorney's decision is binding notwithstanding any wishes of my family and friends.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-inForce',
    title: `<p><strong>In Force</strong></p>`,
    order: 7,
    fallback: '',
    content: `<ol start="6">
      <li>
        The authority granted to my Attorney under this Personal Directive will be in effect
        only if and as long as I have been found to lack Capacity, or it is voluntarily revoked by me.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-capacityDetermination',
    title: `<p><strong>Determination of Capacity</strong></p>`,
    order: 8,
    fallback: '',
    content: `<ol start="7">
      <li>
        A determination of lack of Capacity will be made by an Assessor who is qualified to do assessments of
        Capacity as described in the regulations to the Act.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-notification',
    title: `<p><strong>Notification on Determination of Incapacity</strong></p>`,
    order: 9,
    fallback: '',
    content: `<ol start="8">
      <li>
        If a determination is made that I lack Capacity under the Act to make personal decisions on my own
        behalf then I instruct the person or persons making that determination to provide a written copy of that
        declaration to me and to the Attorney I have designated in this Personal Directive.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-treatments',
    title: `<p><strong>Treatment Directions and End-Of-Life Decisions</strong></p>`,
    order: 10,
    fallback: '',
    content: `<ol start="9">
      <li>
        Subject to any decision or direction of my Attorney to the contrary, I direct that my health care providers
        and others involved in my care provide, withhold or withdraw treatment in accordance with my
        directions below:
        <ol type="a">
          <li>
            If I have an incurable and irreversible terminal condition that will result in my death, I direct that:
            <ul>
              <li>{{#if statements.terminalCondition.noLifeSupport}}I do not wish to be given life support or other life-prolonging treatment.{{else}}I wish to be given life support or other life-prolonging treatment.{{/if}}</li>
              <li>{{#if statements.terminalCondition.noTubeFeeding}}I do not wish to receive tube feeding, even if withholding such feeding would hasten my death.{{else}}I wish to receive tube feeding.{{/if}}</li>
              <li>{{#if statements.terminalCondition.noActiveTreatment}}I do not wish to receive active treatment for any other separate condition that threatens my life.{{else}}I wish to receive active treatment for any other separate condition that threatens my life.{{/if}}</li>
            </ul>
          </li>
          <li>
            If I am diagnosed as persistently unconscious and will not regain consciousness, I direct that:
            <ul>
              <li>{{#if statements.unconsciousCondition.noLifeSupport}}I do not wish to be kept on any artificial life support.{{else}}I wish to be kept on any artificial life support.{{/if}}</li>
              <li>{{#if statements.unconsciousCondition.noTubeFeeding}}I do not wish to receive tube feeding, even if withholding such feeding would hasten my death.{{else}}I wish to receive tube feeding.{{/if}}</li>
              <li>{{#if statements.unconsciousCondition.noActiveTreatment}}I do not wish to receive active treatment for any other separate condition that threatens my life.{{else}}I wish to receive active treatment for any other separate condition that threatens my life.{{/if}}</li>
            </ul>
          </li>
          <li>
            If I am diagnosed as being severely and permanently mentally impaired, I direct that:
            <ul>
              <li>{{#if statements.mentalImpairment.noLifeSupport}}I do not wish to be kept on any artificial life support.{{else}}I wish to be kept on any artificial life support.{{/if}}</li>
              <li>{{#if statements.mentalImpairment.noTubeFeeding}}I do not wish to receive tube feeding, even if withholding such feeding would hasten my death.{{else}}I wish to receive tube feeding.{{/if}}</li>
              <li>{{#if statements.mentalImpairment.noActiveTreatment}}I do not wish to receive active treatment for any other separate condition that threatens my life.{{else}}I wish to receive active treatment for any other separate condition that threatens my life.{{/if}}</li>
            </ul>
          </li>
          <li>
            If my behavior becomes violent or degrading, I direct that:
            <ul>
              <li>{{#if statements.violentBehavior.useDrugs}}I want my symptoms controlled with appropriate drugs, even if that worsens my physical condition or shortens my life.{{else}}I do not want drugs to control my symptoms.{{/if}}</li>
            </ul>
          </li>
          <li>
            If I appear to be in pain, I direct that:
            <ul>
              <li>{{#if statements.painManagement.useDrugs}}I want my symptoms controlled with appropriate drugs, even if that worsens my physical condition or shortens my life.{{else}}I do not want drugs to control my pain.{{/if}}</li>
            </ul>
          </li>
        </ol>
      </li>
    </ol>`,
    keywords: [
      'statements.terminalCondition.noLifeSupport',
      'statements.terminalCondition.noTubeFeeding',
      'statements.terminalCondition.noActiveTreatment',
      'statements.unconsciousCondition.noLifeSupport',
      'statements.unconsciousCondition.noTubeFeeding',
      'statements.unconsciousCondition.noActiveTreatment',
      'statements.mentalImpairment.noLifeSupport',
      'statements.mentalImpairment.noTubeFeeding',
      'statements.mentalImpairment.noActiveTreatment',
      'statements.violentBehavior.useDrugs',
      'statements.painManagement.useDrugs',
    ],
    children: [],
  },
  {
    id: 'poaHealth-revocationInfo',
    title: `<p><strong>Revocation</strong></p>`,
    order: 11,
    fallback: '',
    content: `<ol start="10">
      <li>
        The authority granted in this Personal Directive may be revoked as and where
        permitted by law.
      </li>
      <li>
        I understand that, as long as I have Capacity, I may revoke this Personal Directive at
        any time.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-delegation',
    title: `<p><strong>Delegation of Authority</strong></p>`,
    order: 12,
    fallback: '',
    content: `<ol start="12">
      <li>An Attorney cannot delegate his or her authority as Attorney.</li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-organDonation',
    title: `<p><strong>Organ Donation</strong></p>`,
    order: 13,
    fallback: '',
    content: `<ol start="13">
      <li>
        {{#if POAInfo.organDonation}}I wish for my organs and tissue to be used for transplantation upon my death.{{else}}I do not wish for my organs and tissue to be used for transplantation upon my death.{{/if}}
      </li>
    </ol>`,
    keywords: ['POAInfo.organDonation'],
    children: [],
  },
  {
    id: 'poaHealth-additionalInstructions',
    title: `<p><strong>Additional Instructions</strong></p>`,
    order: 14,
    fallback: '',
    content: `<ol start="14">
      <li>
        I wish to be kept comfortable and free from pain. This means that I may be given pain medication even
        though it may dull consciousness and indirectly shorten my life.
      </li>
      <li>
        I direct that my Attorney shall be entitled to receive reimbursement for all reasonable expenses that
        they incur in their capacity as my Attorney, from my assets.
      </li>
      {{#if restrictions}}
        <li>
          Additional restrictions or instructions: {{restrictions}}
        </li>
      {{/if}}
      {{#if POAInfo.dnr}}
        <li>
          I have a Do Not Resuscitate (DNR) order in place.
        </li>
      {{/if}}
    </ol>`,
    keywords: ['restrictions', 'POAInfo.dnr'],
    children: [],
  },
  {
    id: 'poaHealth-liability',
    title: `<p><strong>Liability of Attorney</strong></p>`,
    order: 15,
    fallback: '',
    content: `<ol start="18">
      <li>
        An Attorney will not be liable for any mistake or error in judgment or for any act or omission believed to
        be made in good faith and believed to be within the scope of authority conferred or implied by this
        Personal Directive and by the Act.
      </li>
      <li>
        Without limiting the liability of the Attorney, the Attorney will be liable for any and all acts and omissions
        involving intentional wrongdoing.
      </li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-general',
    title: `<p><strong>General</strong></p>`,
    order: 16,
    fallback: '',
    content: `<ol start="20">
      <li>A copy of this Personal Directive has the same effect as the original.</li>
      <li>
        If any part or parts of this Personal Directive is found to be invalid or illegal under
        applicable law by a court of competent jurisdiction, the invalidity or illegality of that part or parts will not
        in any way affect the remaining parts and this document will be construed as though the invalid or
        illegal part or parts had never been included in this Personal Directive. But if the
        intent of this Personal Directive would be substantially changed by such construction,
        then it shall not be so construed.
      </li>
      <li>This Personal Directive is intended to be governed by the laws of the Province of
          Alberta.</li>
    </ol>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-blankPage',
    title: '',
    order: 17,
    fallback: '',
    content: `<p>The remainder of this page has been intentionally left blank.</p>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaHealth-signature',
    title: `<p><strong>Signed</strong></p>`,
    order: 18,
    fallback: '',
    content: `<p>
      Signed by me under hand and seal in the city of {{personal.city}}, province of {{personal.province}}, this _____ day of
      _______________, 20__, .
    </p>
    <p>__________________________________________________</p>
    <p>{{personal.fullName}}</p>
    <p>{{personal.city}}{{#if personal.province}}, {{personal.province}}{{/if}}</p>
    <p>
      SIGNED AND DECLARED by {{personal.fullName}} on this ____ day of ____________________, 20____ to
      be the Grantor's Personal Directive,  who at the Grantor's
      request and in the presence of the Grantor,  and in the physical presence of each
      other at _______________________, all being present at the same time, have signed our names as witnesses in
      the Grantor's presence on the above date.<br /><br /><br />
<br /> <br />Witness #1 ____________________________________<br /><br /> Address:
<br /> ________________________________________________<br />________________________________________________<br /> <br /><br /><br /><br />
Witness #2 ____________________________________<br /><br /> Address:<br />________________________________________________<br />________________________________________________</p> <br /><p style="text-align: center"><strong>LAST WILL AND TESTAMENT OF {{personal.fullName}}</strong></p><p><br /><br /><br /><br /><br /> <br /><br /><br /><br /><br /><br /> Prepared by: iFinallyWill<br /> Toronto, ON<br /> ifinallywill.com<br /> info@ifinallywill.com<br />
<br /><br /><br /><br />
</p>`,
    keywords: ['personal.city', 'personal.province', 'personal.fullName'],
    children: [],
  },
  {
    id: 'poaHealth-attorneyAcknowledgment',
    title: `<p><strong>Attorney Acknowledgment</strong></p>`,
    order: 19,
    fallback: '',
    content: `<p>(Each Attorney should sign or acknowledge the Personal Directive)</p>
    <p>________________________________ (Sign)</p>
    <p>{{attorneyOne.fullName}}</p>
    <p>{{attorneyOne.city}}, {{attorneyOne.province}}</p>
    <p>Date:______________________________</p>
    <br/>
    {{#if attorneyTwo.length}}
      <p>________________________________ (Sign)</p>
      <p>{{attorneyTwo.0.fullName}}</p>
      <p>{{attorneyTwo.0.city}}, {{attorneyTwo.0.province}}</p>
      <p>Date:______________________________</p>
    {{/if}}`,
    keywords: ['attorneyOne.fullName', 'attorneyOne.city', 'attorneyOne.province', 'attorneyTwo'],
    children: [],
  },
  {
    id: 'poaHealth-recordOfCopies',
    title: `<p><strong>Record of Copies</strong></p>`,
    order: 20,
    fallback: '',
    content: `<p>Record of people and institutions to whom I have given a copy of this Personal Directive:</p>
    <ol>
      <li>______________________ Date: _______________</li>
      <li>______________________ Date: _______________</li>
      <li>______________________ Date: _______________</li>
      <li>______________________ Date: _______________</li>
      <li>______________________ Date: _______________</li>
      <li>______________________ Date: _______________</li>
    </ol>`,
    keywords: [],
    children: [],
  },
];
