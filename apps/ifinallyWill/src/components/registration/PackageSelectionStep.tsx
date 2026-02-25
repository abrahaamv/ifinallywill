/**
 * Step 11: Package Selection — choose will package
 * Uses package data from utils/packageUtils.
 */

import type { RegistrationData } from '../../hooks/useRegistrationWizard';
import { DEFAULT_PACKAGES, type Package } from '../../utils/packageUtils';
import { NavButtons } from './primitives/NavButtons';
import { SectionTitle } from './primitives/SectionTitle';
import { StepSubtitle } from './primitives/StepSubtitle';

interface Props {
  data: RegistrationData;
  onUpdate: (partial: Partial<RegistrationData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PackageSelectionStep({ data, onUpdate, onNext, onBack }: Props) {
  const hasPartner = data.has_partner === 'yes';

  // Filter: hide couples package if no partner
  const packages = hasPartner
    ? DEFAULT_PACKAGES
    : DEFAULT_PACKAGES.filter((p) => !p.name.toLowerCase().includes('couples'));

  const selectPackage = (pkg: Package) => {
    onUpdate({
      selected_package: pkg.id,
      package_price: pkg.price,
      package_name: pkg.name,
    });
  };

  return (
    <div className="animate-slide-in-right">
      <SectionTitle>Choose Your Package</SectionTitle>
      <StepSubtitle>Select the plan that works best for your situation.</StepSubtitle>

      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: `repeat(${packages.length}, 1fr)`,
          gap: '1.25rem',
        }}
      >
        {packages.map((pkg) => {
          const isSelected = data.selected_package === pkg.id;
          return (
            <div
              key={pkg.id}
              role="button"
              tabIndex={0}
              onClick={() => selectPackage(pkg)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectPackage(pkg);
                }
              }}
              style={{
                border: `2px solid ${isSelected ? '#0A1E86' : '#E5E7EB'}`,
                borderRadius: '16px',
                padding: '2rem 1.5rem',
                cursor: 'pointer',
                background: isSelected ? 'rgba(10, 30, 134, 0.05)' : '#fff',
                boxShadow: isSelected
                  ? '0 4px 6px rgba(10, 30, 134, 0.2)'
                  : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
                textAlign: 'center',
              }}
              aria-pressed={isSelected}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000', marginBottom: '0.5rem' }}>
                {pkg.name}
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0A1E86', marginBottom: '1rem' }}>
                ${pkg.price}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
                {pkg.features.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      padding: '0.375rem 0',
                      fontSize: '0.9375rem',
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ color: '#0A1E86', fontWeight: 700 }}>&#x2713;</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Continue &rarr;"
        nextDisabled={data.selected_package === null}
      />
    </div>
  );
}
