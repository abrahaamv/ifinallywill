import type { TemplateSection } from '../../../lib/template-renderer';

export const sections: TemplateSection[] = [
  {
    id: 'poaProperty-titleHeader',
    title: `<h2 class='document-header'>Continuing Power of Attorney for Property of {{personal.fullName}}</h2><br />`,
    order: 1,
    fallback: '',
    content: `<p><strong>CONTINUING POWER OF ATTORNEY FOR PROPERTY OF {{personal.fullName}}</strong></p>`,
    keywords: ['personal.fullName'],
    children: [],
  },
  {
    id: 'poaProperty-appoint',
    title: '',
    order: 2,
    fallback: '',
    content: `<p>
 I, {{personal.fullName}} of {{personal.city}}
{{#if personal.province}}, {{personal.province}}{{/if}}, revoke any previous continuing Power of Attorney for
Property made by me and APPOINT {{attorneyOne.fullName}}
{{#if attorneyOne.city}} of {{attorneyOne.city}}{{/if}}
{{#if attorneyOne.province}}, {{attorneyOne.province}}{{/if}}{{#if attorneyOne.country}}, {{attorneyOne.country}}{{/if}}{{#if attorneyJoint.fullName}} and {{attorneyJoint.fullName}}{{#if attorneyJoint.city}} of {{attorneyJoint.city}}{{/if}}{{#if attorneyJoint.province}}, {{attorneyJoint.province}}{{/if}}{{#if attorneyJoint.country}}, {{attorneyJoint.country}}{{/if}} to be my JOINT Attorney(s){{else}} to be my sole Attorney(s){{/if}} for
Property (my "Attorney(s)").
</p>`,
    keywords: [
      'personal.fullName',
      'personal.city',
      'personal.province',
      'attorneyOne.relation',
      'attorneyOne.fullName',
      'attorneyOne.city',
      'attorneyOne.province',
    ],
    children: [],
  },
  {
    id: 'poaProperty-substitute',
    title: '',
    order: 3,
    fallback: '',
    content: `{{#if attorneyTwo.length}}
 {{#with attorneyTwo.[0]}}
 <p>
 If {{../attorneyOne.fullName}}{{#if ../attorneyJoint.fullName}} and/or {{../attorneyJoint.fullName}}{{/if}} cannot or will not be my Attorney(s) because of refusal, resignation, death, mental incapacity, or
 removal by the court, I SUBSTITUTE {{fullName}}
 {{#if city}} of {{city}}{{/if}}
 {{#if province}}, {{province}}{{/if}}{{#if country}}, {{country}}{{/if}} to be my sole Attorney(s).
 </p>
 {{/with}}

 {{#each attorneyTwo}}
 {{#if @index}}
 <p>
 {{#with (lookup ../attorneyTwo (subtract @index 1))}}
 If {{fullName}} cannot or will not be my Attorney(s) because of refusal, resignation, death, mental incapacity, or
 {{/with}}
 removal by the court, I SUBSTITUTE {{fullName}}
 {{#if city}} of {{city}}{{/if}}
 {{#if province}}, {{province}}{{/if}}{{#if country}}, {{country}}{{/if}} to be my sole Attorney(s).
 </p>
 {{/if}}
 {{/each}}
{{/if}}`,
    keywords: ['attorneyTwo', 'attorneyOne.fullName'],
    children: [],
  },
  {
    id: 'poaProperty-definitions',
    title: '',
    order: 4,
    fallback: '',
    content: `<p>As used in this document:</p>

<ul>
 <li>"Act" means the Powers of Attorney Act, R.S.N.B. 1973, c. P-6.</li>
 <li>"Assessor" means a person who is designated by the regulations to the Act as being qualified to do
 assessments of Capacity.</li>
 <li>"Capacity" means the person is able to understand information that is relevant to making a decision
 concerning his or her own health care, nutrition, shelter, clothing, hygiene or safety, and is able to
 appreciate the reasonably foreseeable consequences of a decision or lack of decision.</li>
</ul>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaProperty-authority',
    title: '',
    order: 5,
    fallback: '',
    content: `<p>I AUTHORIZE subject to the law and to any conditions or restrictions contained in this document, my
 Attorney(s) to do on my behalf any acts which can be performed by an Attorney, and specifically without
 limitation anything in respect of property that I could do if capable of managing property except make my Will.</p>
<p>This document shall be considered to be a continuing power of Attorney for Property under the Act.</p>
<p>I revoke any previous Powers of Attorney for Property.</p>
<p>For clarity, my Attorney(s) have the following powers in addition to the general powers noted above, subject to
 any conditions or restrictions contained herein.</p>
<ul>
 <li>My Attorney shall have the authority to act as my litigation guardian if one is required to commence,
 defend, or represent me in any court proceedings.</li>
 <li>To act as my representative for all purposes related to the Canada Revenue Agency and any dealings
 with any level of government.</li>
</ul>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaProperty-restrictions',
    title: '<p>CONDITIONS AND RESTRICTIONS</p>',
    order: 6,
    fallback: '',
    content: `{{#if restrictions}}
 <ol>
 <li>{{restrictions}}</li>
 </ol>
{{else}}
 <p>No conditions or restrictions upon Power of Attorney.</p>
{{/if}}`,
    keywords: ['restrictions'],
    children: [],
  },
  {
    id: 'poaProperty-activation',
    title: '',
    order: 7,
    fallback: '',
    content: `{{#if_eq activationType "incapacity"}}
 <p>The authority granted to my Attorney under this Power of Attorney for Personal Property will be in effect if and
 as long as I have been found by an Assessor to lack Capacity, or it is voluntarily revoked by me.</p>
{{/if_eq}}
{{#if_eq activationType "immediate"}}
 <p>The authority granted to my Attorney under this Power of Attorney for Personal Property will be in effect immediately.</p>
{{/if_eq}}`,
    keywords: ['activationType'],
    children: [],
  },
  {
    id: 'poaProperty-compensation',
    title: '',
    order: 8,
    fallback: '',
    content: `<p>Unless otherwise stated in this document, I authorize my Attorney(s) to take annual compensation from my
 property in accordance with the fee scale prescribed by regulation for the compensation of Attorneys for
 Property made pursuant to Section 90 of the Act.</p>`,
    keywords: [],
    children: [],
  },
  {
    id: 'poaProperty-signature',
    title: '',
    order: 9,
    fallback: '',
    content: `<p>The remainder of this page has been intentionally left blank.</p>
<p>Signed by me under hand and seal in the city of {{personal.city}}, province of {{personal.province}}, this _____ day of
 _____________, 20__, </p>
<p>__________________________________________________<br />
 {{personal.fullName}}<br />
 {{personal.city}}{{#if personal.province}}, {{personal.province}}{{/if}}<br />
</p>
<p>SIGNED AND DECLARED by {{personal.fullName}} on this ____ day of ____________________, 20____to be the
 Grantor's Power of Attorney for Property, who at the Grantor's request and in the
 presence of the Grantor, in the physical presence of each other at Vaughan,
 Ontario, all being present at the same time, have signed our names as witnesses in the Grantor's presence
 on the above date.<br /><br /><br />
<br /> <br />Witness #1 ____________________________________<br /><br /> Address:
<br /> ________________________________________________<br />________________________________________________<br /> <br /><br /><br /><br />
Witness #2 ____________________________________<br /><br /> Address:<br />________________________________________________<br />________________________________________________</p> <br /><br /><br /><br />
<br /><br /><br /><br />
</p>`,
    keywords: ['personal.city', 'personal.province', 'personal.fullName'],
    children: [],
  },
];
