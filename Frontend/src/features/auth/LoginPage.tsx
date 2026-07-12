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
import { login } from './api';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: login,
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
    <div className="flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900 dark:text-white">Log in to ARES</h1>
        <p className="mb-6 text-sm text-slate-500">Enterprise Asset &amp; Resource Management</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {errors.root && <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p>}

          <Button type="submit" isLoading={mutation.isPending} className="mt-2">
            Log in
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-1 text-center text-sm text-slate-500">
          <Link to="/signup" className="hover:underline">
            Join an existing organization
          </Link>
          <Link to="/register-organization" className="hover:underline">
            Set up a new organization
          </Link>
        </div>
      </Card>
    </div>
  );
}
