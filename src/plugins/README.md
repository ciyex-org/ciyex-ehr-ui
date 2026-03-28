# Native Plugins

This directory contains **Tier 1 (native) plugins** that ship as part of the EHR-UI bundle. These are trusted plugins that render directly in the React tree without sandboxing.

## Creating a Plugin

1. Create a new directory: `src/plugins/{your-plugin-slug}/`
2. Create `index.tsx` with a `register` export:

```tsx
import type { PluginAPI } from "@/components/plugins/NativePluginLoader";

export function register(api: PluginAPI) {
    // Register components into extension points (slots)
    api.contribute({
        slotName: "patient-chart:tab",
        component: MyTabComponent,
        label: "My Tab",
        icon: "Layers",    // Lucide icon name
        priority: 50,      // Lower = renders first
    });

    api.contribute({
        slotName: "patient-chart:banner-alert",
        component: MyBannerComponent,
    });

    // Access org-specific config
    console.log("Plugin config:", api.config);
}
```

3. Register the loader in `src/components/plugins/NativePluginLoader.tsx`:

```ts
const NATIVE_PLUGIN_LOADERS = {
    "your-plugin-slug": () => import("@/plugins/your-plugin-slug"),
};
```

4. Ensure the app is installed for the org via the Hub (or seeded in `app_installations`).

## Available Extension Points

### Patient Chart
| Slot Name | Description | Context Props |
|-----------|-------------|---------------|
| `patient-chart:tab` | Full tab in sidebar navigation | `patientId` |
| `patient-chart:action-bar` | Buttons in header action area | `patientId` |
| `patient-chart:banner-alert` | Alert banners above content | `patientId` |

### Encounter
| Slot Name | Description | Context Props |
|-----------|-------------|---------------|
| `encounter:toolbar` | Buttons next to Sign/Unsign | `patientId`, `encounterId`, `status` |
| `encounter:sidebar` | Content below section nav | `patientId`, `encounterId` |
| `encounter:form-footer` | Content after form sections | `patientId`, `encounterId`, `status` |

## Plugin API

The `PluginAPI` passed to `register()`:

| Property | Type | Description |
|----------|------|-------------|
| `contribute(c)` | Function | Register a component into a slot |
| `config` | `Record<string, any>` | Org-specific configuration from Hub settings |
| `slug` | `string` | The plugin's app slug identifier |

## Component Props

Each contributed component receives the slot's `context` as props:

```tsx
function MyComponent({ patientId }: { patientId: string }) {
    // Fetch data, render UI...
}
```

## Example

See `demo-care-gaps/` for a working example that contributes a banner alert and a tab to the patient chart.
