/**
 * Step 12: Checkout — order summary with 2-column layout, tax breakdown,
 * package document listing, and payment CTA.
 * Pixel-perfect clone from source CheckoutStep.tsx
 */

import { useState } from 'react';
import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { packageDocuments } from '../../utils/packageUtils';
import { formatPrice, getTaxBreakdown } from '../../utils/taxUtils';
import { SectionTitle } from './primitives/SectionTitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

/* ─── Document display name mapping ─── */
const DOCUMENT_DISPLAY_NAMES: Record<string, string> = {
  primaryWill: 'Last Will and Testament',
  spousalWill: 'Last Will and Testament (Spouse)',
  secondaryWill: 'Secondary Will',
  poaProperty: 'Power of Attorney for Property',
  poaHealth: 'Power of Attorney for Health',
};

function getDocumentDisplayName(docType: string): string {
  return DOCUMENT_DISPLAY_NAMES[docType] ?? docType;
}

function getPackageContents(description: string, province: string): string[] {
  const docs = packageDocuments[description];
  if (!docs) return [];

  const secondaryWillProvinces = ['Ontario', 'British Columbia'];
  const canShowSecondary = secondaryWillProvinces.includes(province);

  const filtered = docs.filter((d) => !(d === 'secondaryWill' && !canShowSecondary));

  const counts: Record<string, number> = {};
  for (const d of filtered) {
    counts[d] = (counts[d] ?? 0) + 1;
  }

  return Object.entries(counts).map(([docType, count]) => {
    const name = getDocumentDisplayName(docType);
    return count > 1 ? `${name} (${count}x)` : name;
  });
}

export function CheckoutStep({ data, onUpdate, onNext, onBack }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSpousalPackage = !!data.wants_spousal_package;

  const basePrice = data.package_price || (isSpousalPackage ? 249 : 159);
  const packageDescription =
    data.package_name ||
    (isSpousalPackage ? 'Two spousal wills and four POAs' : 'One will and two POAs');

  const tax = getTaxBreakdown(basePrice, data.province);
  const packageContents = getPackageContents(packageDescription, data.province);

  const handlePayNow = () => {
    setIsSubmitting(true);
    onUpdate({ payment_status: 'pending' });
    onNext();
  };

  const handleSkipPayment = () => {
    setIsSubmitting(true);
    onUpdate({ payment_status: 'skipped' });
    onNext();
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 transition-opacity duration-300 opacity-100">
      {/* Back button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to plans
        </button>
      </div>

      <div className="text-center mb-5 sm:mb-6 md:mb-8">
        <SectionTitle>Complete Your Registration</SectionTitle>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* ─── Order Summary (Left column) ─── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 text-slate-700 sm:h-[20px] sm:w-[20px]"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Package Summary
            </h2>

            <div className="bg-slate-50 rounded-xl p-3 sm:p-4 md:p-5 mb-4 sm:mb-5 border border-slate-100">
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-gray-800">
                    {packageDescription}
                  </h3>
                  <p className="text-gray-500 text-xs sm:text-sm">
                    {isSpousalPackage
                      ? `for you and ${data.partner_first_name ? data.partner_first_name.split(' ')[0] : 'your spouse'}`
                      : 'for you'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-gray-800 font-bold text-sm sm:text-base">
                    {formatPrice(tax.total)}
                  </div>
                  <div className="text-xs text-gray-500">Standard package + tax</div>
                </div>
              </div>

              {/* Tax breakdown */}
              <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 border border-slate-100">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Package price</span>
                    <span className="text-gray-800">{formatPrice(basePrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{tax.taxLabel}</span>
                    <span className="text-gray-800">
                      {formatPrice(tax.hst > 0 ? tax.hst : tax.gst + tax.pst)}
                    </span>
                  </div>
                  <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
                    <span className="text-gray-800">Total</span>
                    <span className="text-gray-800">{formatPrice(tax.total)}</span>
                  </div>
                </div>
              </div>

              {/* Document list */}
              {packageContents.length > 0 && (
                <div className="space-y-1.5 sm:space-y-2 mt-3 sm:mt-4">
                  <h4 className="font-medium text-gray-700 text-xs sm:text-sm">Which includes:</h4>
                  {packageContents.map((item, index) => (
                    <div key={index} className="flex items-start">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5 sm:mr-2 mt-0.5 flex-shrink-0 sm:h-[16px] sm:w-[16px]"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-gray-600 text-xs sm:text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── Payment Section (Right column) ─── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 md:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
              Payment amount:
            </h2>

            <div className="space-y-3 sm:space-y-4">
              {/* Total price card */}
              <div className="bg-slate-800 p-3 sm:p-4 rounded-xl text-white">
                <div className="flex justify-between items-center font-bold mb-1">
                  <span className="text-sm sm:text-base text-white">Total:</span>
                  <span className="text-lg sm:text-xl text-white">{formatPrice(tax.total)}</span>
                </div>
                <div className="text-xs text-slate-300 text-right">
                  One-time payment, no subscription
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border-2 border-slate-200 p-6 sm:p-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 mt-4 bg-slate-800 rounded-full mb-4">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="sm:h-[28px] sm:w-[28px]"
                    >
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">
                    Ready to Create Your Documents
                  </h3>
                  <p className="text-slate-600 text-sm sm:text-base mb-6">
                    Continue to our document builder and complete payment later from your dashboard
                  </p>
                  <button
                    type="button"
                    className={`w-full py-4 mt-4 sm:py-5 px-8 rounded-xl font-bold text-base sm:text-lg transition-all duration-200 shadow-lg flex items-center justify-center ${
                      isSubmitting
                        ? 'bg-[#0A1E86]/70 cursor-not-allowed'
                        : 'bg-[#0A1E86] hover:bg-[#0C1F3C] hover:shadow-xl transform hover:-translate-y-0.5 group'
                    } text-white`}
                    onClick={handlePayNow}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Creating Your Account...
                      </>
                    ) : (
                      <>
                        Pay now
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ml-3 group-hover:translate-x-1 transition-transform duration-200 sm:h-[22px] sm:w-[22px]"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="w-full mt-3 py-3 px-6 rounded-xl font-medium text-sm sm:text-base transition-all duration-200 border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                    onClick={handleSkipPayment}
                    disabled={isSubmitting}
                  >
                    Continue without payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
