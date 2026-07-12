import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth.store';
import { ApiRequestError } from '@/types/api.types';
import { registerOrganization } from './api';
import { AuthLayout } from './AuthLayout';

const schema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  adminName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[0-9]/, 'Must contain a number'),
});

type FormValues = z.infer<typeof schema>;

/** Tenant bootstrap: the only place a user is ever created as Admin directly (not a self-elevation — there's no existing org/Admin to promote them). */
export function RegisterOrganizationPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: registerOrganization,
    onSuccess: (result) => {
      setSession(result.user, result.tokens);
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      const message = err instanceof ApiRequestError ? err.message : 'Something went wrong';
      setError('root', { message });
    },
  });

  return (
    <AuthLayout>
      <Card>
        <h1 className="mb-1 font-display text-2xl font-semibold text-ink-900 text-black">Set up your organization</h1>
        <p className="mb-6 text-sm text-ink-500">You'll be the Admin for this organization.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <Input label="Organization name" error={errors.organizationName?.message} {...register('organizationName')} />
          <Input label="Your full name" error={errors.adminName?.message} {...register('adminName')} />
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {errors.root && <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>}

          <Button type="submit" isLoading={mutation.isPending} className="mt-2">
            Create organization
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-ink-500">
          <Link to="/login" className="text-brand-700 hover:underline dark:text-brand-400">
            Already have an account? Log in
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
