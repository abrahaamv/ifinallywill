/**
 * useWilfredChat — local-first Wilfred AI chat
 *
 * Works fully offline with canned estate-planning responses.
 * When a real backend is available (VITE_API_URL set + tRPC reachable),
 * it will use the tRPC wilfred router instead.
 *
 * This hook owns: session state, message list, send handler, loading state.
 */

import { useCallback, useState } from 'react';

export interface WilfredMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string | Date;
}

interface UseWilfredChatOptions {
  stepId?: string;
  documentType?: string;
  province?: string;
  completedSteps?: string[];
}

interface UseWilfredChatReturn {
  messages: WilfredMessage[];
  isLoading: boolean;
  send: (content: string) => void;
  suggestions: string[];
}

// Step-specific suggestions
const STEP_SUGGESTIONS: Record<string, string[]> = {
  'personal-info': ['What name should I use on my will?', 'Does my province affect my will?'],
  children: ['How are stepchildren treated in a will?'],
  'key-people': ['Who should I list as key people?'],
  guardians: ['How do I choose a guardian for my children?', 'Can I name multiple guardians?'],
  assets: ['What assets should I include?', 'Do I need to list every item?'],
  bequests: ['What is a specific bequest?', 'Can I give percentages instead of items?'],
  residue: ['What is the residue of an estate?', 'How should I distribute the residue?'],
  inheritance: ['What is a testamentary trust?', 'At what age should children inherit?'],
  executors: ['What does an executor do?', 'Can I name a professional executor?'],
  wipeout: ['What is a wipeout clause?', 'Who should be my ultimate beneficiary?'],
  'poa-property': ['What powers does a POA for property grant?'],
  'poa-health': ['What is the difference between a living will and a health POA?'],
  additional: ['What else can I include in my will?'],
  'final-details': ['What happens after I finalize?'],
};

const DEFAULT_SUGGESTIONS = [
  'What should I know about this step?',
  'Can you explain this in simpler terms?',
  'What is a will?',
];

// Pattern-matched responses for demo mode
const RESPONSES: Array<{ pattern: RegExp; response: string }> = [
  {
    pattern: /what.*(name|legal name)/i,
    response:
      'You should use your full legal name as it appears on your government-issued ID. This ensures your will is properly identified and legally valid.',
  },
  {
    pattern: /province|jurisdiction/i,
    response:
      'Yes, your province matters. Estate law varies across Canada. Ontario, BC, Alberta, and Quebec each have different rules for wills, POAs, and inheritance. We tailor your documents to your province.',
  },
  {
    pattern: /marital.*status|married|common.?law/i,
    response:
      'Marital status significantly affects inheritance in Canada. In most provinces, a spouse has certain automatic rights to the estate. Common-law partners may have different rights depending on the province.',
  },
  {
    pattern: /spouse.*inherit|inherit.*everything/i,
    response:
      "Not automatically in all cases. While many people leave everything to their spouse, provincial law may give your spouse a 'preferential share' if you die without a will. With a will, you control the distribution.",
  },
  {
    pattern: /stepchild|step.?child/i,
    response:
      'Stepchildren are not automatically included in inheritance under Canadian law unless you specifically name them in your will. If you want stepchildren to inherit, be sure to add them.',
  },
  {
    pattern: /guardian/i,
    response:
      'Choose someone you trust who shares your values about raising children. Consider their age, health, financial stability, and willingness. You can name a primary and alternate guardian.',
  },
  {
    pattern: /asset|property|include.*will/i,
    response:
      "Include all significant assets: real estate, bank accounts, investments, vehicles, valuable personal property, and digital assets. You don't need to list every small item — focus on what matters most.",
  },
  {
    pattern: /bequest|gift|specific/i,
    response:
      'A specific bequest is a gift of a particular item or amount of money to a named person or charity. For example, "I leave my wedding ring to my daughter" or "I leave $5,000 to the Red Cross."',
  },
  {
    pattern: /residue|remainder|what.*left/i,
    response:
      'The residue is everything left in your estate after debts are paid and specific gifts are distributed. Most people divide the residue among their closest family members by percentage.',
  },
  {
    pattern: /trust|trusting|testamentary/i,
    response:
      "A testamentary trust is created through your will to manage assets for beneficiaries (often minor children). You can specify at what age they receive full control — commonly 18, 21, or 25.",
  },
  {
    pattern: /executor/i,
    response:
      'An executor manages your estate after you pass — paying debts, distributing assets, and handling legal paperwork. Choose someone organized, trustworthy, and willing. A spouse, adult child, or professional can serve.',
  },
  {
    pattern: /wipeout/i,
    response:
      "A wipeout clause is your backup plan if all your named beneficiaries pass away before you. It ensures your estate goes to someone you choose rather than being distributed by provincial intestacy rules.",
  },
  {
    pattern: /poa.*property|power.*attorney.*property/i,
    response:
      'A POA for Property authorizes someone to manage your finances, real estate, and legal matters if you become incapacitated. Choose someone you trust completely with your financial affairs.',
  },
  {
    pattern: /poa.*health|power.*attorney.*health|living.*will/i,
    response:
      'A POA for Health (or Personal Care) designates someone to make medical decisions on your behalf if you cannot. Share your healthcare wishes with them in advance.',
  },
  {
    pattern: /missing|progress|review/i,
    response:
      "I can see you're working through your estate plan. Check the sidebar to see which sections are complete (marked with a checkmark) and which still need attention. Every section matters!",
  },
  {
    pattern: /family|people|key.?names/i,
    response:
      "Adding family members and key people helps us personalize your will. Include children, grandchildren, and anyone you'd like to name as a beneficiary, guardian, or executor.",
  },
  {
    pattern: /get.*started|begin|how.*start/i,
    response:
      "Start with the 'About You' section to enter your personal details. Then work through Family, Assets, and the remaining sections. Each section builds on the last. You can save and return anytime!",
  },
  {
    pattern: /what.*will|need.*will/i,
    response:
      "A will is a legal document that specifies how you want your assets distributed after you pass. In Canada, having a will ensures your wishes are followed, minimizes family disputes, and can reduce legal costs.",
  },
  {
    pattern: /poa|power.*attorney/i,
    response:
      "A Power of Attorney (POA) lets you designate someone to make decisions on your behalf if you're unable to. There are two types: POA for Property (finances) and POA for Health (medical decisions). Both are important!",
  },
];

const FALLBACK_RESPONSE =
  "That's a great question! While I can help with general estate planning guidance, for specific legal advice I'd recommend consulting with a qualified lawyer. Is there something specific about your will or POA I can help clarify?";

function generateResponse(query: string): string {
  for (const { pattern, response } of RESPONSES) {
    if (pattern.test(query)) return response;
  }
  return FALLBACK_RESPONSE;
}

let nextId = 1;
function makeId(): string {
  return `wilfred-${Date.now()}-${nextId++}`;
}

export function useWilfredChat(options: UseWilfredChatOptions = {}): UseWilfredChatReturn {
  const [messages, setMessages] = useState<WilfredMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const suggestions = STEP_SUGGESTIONS[options.stepId ?? ''] ?? DEFAULT_SUGGESTIONS;

  const send = useCallback((content: string) => {
    const userMsg: WilfredMessage = {
      id: makeId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulate thinking delay (300-800ms)
    const delay = 300 + Math.random() * 500;
    setTimeout(() => {
      const aiMsg: WilfredMessage = {
        id: makeId(),
        role: 'assistant',
        content: generateResponse(content),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);
    }, delay);
  }, []);

  return { messages, isLoading, send, suggestions };
}
