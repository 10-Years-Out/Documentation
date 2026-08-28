export const SwitchConfigBuilder = ({ switchDefinition, services }) => {
  const currentSwitch = switchDefinition ?? {
    systemName: "5320-48P-8XE-NORTH-01",
    management: { address: "192.0.2.10", prefixLength: "24", gateway: "192.0.2.1" },
    monitoring: { mode: "standalone-xdr", collector: "192.0.2.30" }
  };
  const sharedServices = services ?? { ntpServer: "192.0.2.20", syslogCollector: "192.0.2.30" };

  const [values, setValues] = useState({
    systemName: currentSwitch.systemName,
    managementAddress: currentSwitch.management.address,
    prefixLength: currentSwitch.management.prefixLength,
    gateway: currentSwitch.management.gateway,
    ntpServer: sharedServices.ntpServer,
    syslogCollector: currentSwitch.monitoring.collector ?? sharedServices.syslogCollector,
    standaloneXdr: currentSwitch.monitoring.mode === "standalone-xdr"
  });
  const [copied, setCopied] = useState(false);

  const update = (key) => (event) => {
    const nextValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((current) => ({ ...current, [key]: nextValue }));
    setCopied(false);
  };

  const commands = useMemo(() => {
    const lines = [
      "disable dhcp vlan default",
      `configure vlan default ipaddress ${values.managementAddress}/${values.prefixLength}`,
      `configure iproute add default ${values.gateway} vr VR-Default`,
      `configure snmp sysName ${values.systemName}`,
      "enable ssh2",
      "configure ssh2 secure-mode on",
      "enable ntp",
      `configure ntp server add ${values.ntpServer}`,
      "configure ntp local-clock none"
    ];

    if (values.standaloneXdr) {
      lines.push(
        `configure syslog add ${values.syslogCollector} vr VR-Default local0`,
        "enable syslog"
      );
    }

    lines.push("enable nodealias ports all", "save config");
    return lines.join("\n");
  }, [values]);

  const copyCommands = () => {
    navigator.clipboard.writeText(commands).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <section className="my-6 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-gradient-to-r from-indigo-50 to-emerald-50 px-5 py-4 dark:border-zinc-800 dark:from-indigo-950/50 dark:to-emerald-950/30">
        <p className="m-0 text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Live documentation component</p>
        <h2 className="mb-0 mt-1 text-xl font-bold text-zinc-950 dark:text-white">Switch configuration builder</h2>
        <p className="mb-0 mt-1 text-sm text-zinc-600 dark:text-zinc-300">Change a definition. The command set updates immediately.</p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="grid content-start gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="system-name" className="block space-y-1.5">
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">System name</span>
              <input id="system-name" value={values.systemName} onChange={update("systemName")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Use the approved site naming standard.</span>
            </label>
          </div>
          <label htmlFor="management-address" className="block space-y-1.5">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Management address</span>
            <input id="management-address" value={values.managementAddress} onChange={update("managementAddress")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">Example uses TEST-NET-1.</span>
          </label>
          <label htmlFor="prefix-length" className="block space-y-1.5">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Prefix length</span>
            <input id="prefix-length" value={values.prefixLength} onChange={update("prefixLength")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">CIDR prefix without the slash.</span>
          </label>
          <label htmlFor="gateway" className="block space-y-1.5">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Default gateway</span>
            <input id="gateway" value={values.gateway} onChange={update("gateway")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">Gateway for the management network.</span>
          </label>
          <label htmlFor="ntp-server" className="block space-y-1.5">
            <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">NTP server</span>
            <input id="ntp-server" value={values.ntpServer} onChange={update("ntpServer")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
            <span className="block text-xs text-zinc-500 dark:text-zinc-400">Use the site-approved time source.</span>
          </label>
          <div className="sm:col-span-2">
            <label htmlFor="syslog-collector" className="block space-y-1.5">
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Syslog collector</span>
              <input id="syslog-collector" value={values.syslogCollector} onChange={update("syslogCollector")} className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white" />
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Used only for the standalone XDR path.</span>
            </label>
          </div>
          <label htmlFor="standalone-xdr" className="flex items-start gap-3 rounded-xl border border-zinc-200 p-3 sm:col-span-2 dark:border-zinc-800">
            <input id="standalone-xdr" type="checkbox" checked={values.standaloneXdr} onChange={update("standaloneXdr")} className="mt-1 h-4 w-4 accent-indigo-600" />
            <span>
              <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Include standalone XDR syslog</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-400">Clear this option for a NAC-managed switch.</span>
            </span>
          </label>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Generated ExtremeXOS commands</span>
            <button type="button" onClick={copyCommands} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {copied ? "Copied" : "Copy commands"}
            </button>
          </div>
          <pre aria-live="polite" className="max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-xs leading-6 text-emerald-300 shadow-inner"><code>{commands}</code></pre>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Review generated commands against the approved client records before you run them.</p>
        </div>
      </div>
    </section>
  );
};
