import { PageWrapper } from '@/features/layout/components/page-wrapper';

import { Form } from './__components/form';

export default async function Page() {
  return (
    <PageWrapper title="Test feature" subtitle="This is a test feature and will be removed after testing">
      <Form />
    </PageWrapper>
  );
}
