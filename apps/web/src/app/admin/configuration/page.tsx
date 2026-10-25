import { api } from "@/lib/api";
import type { ProviderConfiguration } from "@/lib/configuration-types";
import { ProviderConfigurationPanel } from "@/components/provider-configuration";
export const metadata = { title: "Configuration" };
export default async function ConfigurationPage() {
  const settings = await api<ProviderConfiguration>("/admin/configuration");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Configuration</h1>
          <p className="muted">Manage payments and AI from your admin desk.</p>
        </div>
        <span className="pill">Admin only</span>
      </div>
      <ProviderConfigurationPanel settings={settings} />
    </>
  );
}
