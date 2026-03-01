/**
 * Profile Edit page — update name and profile settings
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { trpc } from '../../utils/trpc';

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function ProfileEditPage() {
  const navigate = useNavigate();
  const { data: profile, isLoading } = trpc.users.me.useQuery();
  const utils = trpc.useUtils();

  const updateMutation = trpc.users.updateMe.useMutation({
    onSuccess: () => {
      utils.users.me.invalidate();
      navigate('/app/profile');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({ name: profile.name || '' });
    }
  }, [profile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate({ name: data.name });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[var(--ifw-neutral-100)] rounded" />
          <div className="h-40 bg-[var(--ifw-neutral-100)] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link
          to="/app/profile"
          className="inline-flex items-center gap-1 text-sm text-[var(--ifw-text-muted)] hover:text-[var(--ifw-text)] mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile
        </Link>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      {updateMutation.isError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-[var(--ifw-error)]">
          {updateMutation.error?.message || 'Failed to update profile. Please try again.'}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="border border-[var(--ifw-border)] rounded-xl p-6 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ifw-primary-500)]"
              placeholder="Your full name"
            />
            {errors.name && (
              <p className="text-sm text-[var(--ifw-error)] mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--ifw-text-muted)]">
              Email
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full border rounded-lg px-3 py-2 text-sm bg-[var(--ifw-neutral-50)] text-[var(--ifw-text-muted)] cursor-not-allowed"
            />
            <p className="text-xs text-[var(--ifw-text-muted)] mt-1">
              Email cannot be changed. Contact support for assistance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: 'var(--ifw-primary-700)' }}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to="/app/profile"
            className="px-6 py-2.5 text-sm font-medium text-[var(--ifw-text-muted)] border rounded-lg hover:bg-[var(--ifw-neutral-50)]"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
