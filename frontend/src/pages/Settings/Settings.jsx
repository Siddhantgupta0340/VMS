import {
  Building2,
  Bell,
  Lock,
  Palette,
  Save,
} from "lucide-react";

const Settings = () => {
  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-3xl font-bold">
          Settings
        </h1>

        <p className="text-slate-500 mt-1">
          Manage your application preferences.
        </p>
      </div>

      {/* Company */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-2">

          <Building2 className="text-blue-600"/>

          <h2 className="text-xl font-semibold">
            Company Information
          </h2>

        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <input
            placeholder="Company Name"
            className="rounded-xl border p-3"
          />

          <input
            placeholder="Company Email"
            className="rounded-xl border p-3"
          />

          <input
            placeholder="Phone Number"
            className="rounded-xl border p-3"
          />

          <input
            placeholder="GST Number"
            className="rounded-xl border p-3"
          />

        </div>

      </div>

      {/* Security */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-2">

          <Lock className="text-blue-600"/>

          <h2 className="text-xl font-semibold">
            Security
          </h2>

        </div>

        <div className="space-y-4">

          <input
            type="password"
            placeholder="Change Password"
            className="w-full rounded-xl border p-3"
          />

          <label className="flex items-center gap-3">

            <input type="checkbox"/>

            Enable Two-Factor Authentication

          </label>

        </div>

      </div>

      {/* Notifications */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-2">

          <Bell className="text-blue-600"/>

          <h2 className="text-xl font-semibold">
            Notifications
          </h2>

        </div>

        <div className="space-y-4">

          <label className="flex items-center gap-3">

            <input type="checkbox"/>

            Email Notifications

          </label>

          <label className="flex items-center gap-3">

            <input type="checkbox"/>

            SMS Notifications

          </label>

        </div>

      </div>

      {/* Appearance */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-2">

          <Palette className="text-blue-600"/>

          <h2 className="text-xl font-semibold">
            Appearance
          </h2>

        </div>

        <select className="rounded-xl border p-3">

          <option>Light Theme</option>

          <option>Dark Theme</option>

        </select>

      </div>

      <button className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">

        <Save size={18}/>

        Save Changes

      </button>

    </div>
  );
};

export default Settings;