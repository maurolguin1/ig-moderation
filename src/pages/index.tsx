import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-4">Bienvenido</h1>
      <p>Esta aplicación te permite importar comentarios de Instagram, explorarlos, compararlos y generar informes profesionales utilizando Supabase como backend en la nube.</p>
    </Layout>
  );
}