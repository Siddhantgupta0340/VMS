import {
  ArrowLeft,
  Building2,
  User,
  Landmark,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { createVendor } from "../../services/vendorService";
const input =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-600";

const AddVendor = () => {

  const navigate = useNavigate();

const [formData, setFormData] = useState({
  companyName: "",
  vendorCode: "",
  vendorCategory: "Manufacturer",
  vendorType: "",
  gst: "",
  pan: "",
  contactPerson: "",
  designation: "",
  email: "",
  phone: "",
  website: "",
  department: "",
  country: "",
  state: "",
  city: "",
  postalCode: "",
  address: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  paymentTerms: "",
  currency: "",
  status: "Active",
  notes: "",
});

const handleChange = (e) => {
  setFormData((prev) => ({
    ...prev,
    [e.target.name]: e.target.value,
  }));
};

const handleSubmit = async () => {
await createVendor(formData);
  alert("✅ Vendor created successfully");

  navigate("/vendors");
};

  return (
    <div className="space-y-8">

      {/* Header */}

      <div className="flex items-center justify-between">

        <div>
          <Link
            to="/vendors"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600"
          >
            <ArrowLeft size={18} />
            Back to Vendors
          </Link>

          <h1 className="mt-4 text-4xl font-bold">
            Add New Vendor
          </h1>

          <p className="mt-2 text-slate-500">
            Create and register a new supplier in ProcureFlow ERP.
          </p>
        </div>

      </div>

      {/* COMPANY INFORMATION */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center gap-3 border-b p-6">

          <Building2 className="text-blue-600" />

          <h2 className="text-xl font-semibold">
            Company Information
          </h2>

        </div>

        <div className="grid grid-cols-2 gap-6 p-6">

          <div>
            <label className="mb-2 block text-sm font-medium">
              Company Name
            </label>

            <input
  name="companyName"
  value={formData.companyName}
  onChange={handleChange}
  className={input}
  placeholder="ABC Industries Pvt Ltd"
/>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Vendor Code
            </label>

            <input
              name="vendorCode"
              value={formData.vendorCode}
              onChange={handleChange}
              className={input}
              placeholder="VND-1005"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Vendor Category
            </label>

            <select
  className={input}
  name="vendorCategory"
  value={formData.vendorCategory}
  onChange={handleChange}
>
  <option value="">Select Category</option>
  <option value="Manufacturer">Manufacturer</option>
  <option value="Supplier">Supplier</option>
  <option value="Distributor">Distributor</option>
  <option value="Service Provider">Service Provider</option>
</select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Vendor Type
            </label>

            <select className={input}>
              <option>Domestic</option>
              <option>International</option>
            </select>
          </div>

          <div>
  <label className="mb-2 block text-sm font-medium">
    GST Number
  </label>

  <input
    type="text"
    name="gst"
    value={formData.gst}
    onChange={handleChange}
    placeholder="Enter GST Number"
    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
  />
</div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              PAN Number
            </label>

            <input
              className={input}
              name="pan"
              value={formData.pan}
              onChange={handleChange}
              placeholder="ABCDE1234F"
            />
          </div>

        </div>

      </div>

      {/* PRIMARY CONTACT */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex items-center gap-3 border-b p-6">

          <User className="text-blue-600" />

          <h2 className="text-xl font-semibold">
            Primary Contact
          </h2>

        </div>

        <div className="grid grid-cols-2 gap-6 p-6">

          <div>
  <label className="mb-2 block text-sm font-medium">
    Contact Person
  </label>

  <input
    type="text"
    name="contactPerson"
    value={formData.contactPerson}
    onChange={handleChange}
    placeholder="Enter Contact Person"
    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
  />
</div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Designation
            </label>

            <input
              className={input}
              placeholder="Sales Manager"
              name="designation"
              value={formData.designation}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              className={input}
              placeholder="john@company.com"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Phone
            </label>

            <input
              className={input}
              placeholder="+91 9876543210"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Website
            </label>

            <input
              className={input}
              placeholder="www.company.com"
              name="website"
              value={formData.website}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Department
            </label>

            <input
              className={input}
              placeholder="Procurement"
              name="department"
              value={formData.department}
              onChange={handleChange}
            />
          </div>

        </div>

      </div>

      {/* BUSINESS ADDRESS */}

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

  <div className="flex items-center gap-3 border-b p-6">

    <Landmark className="text-blue-600" />

    <h2 className="text-xl font-semibold">
      Business Address
    </h2>

  </div>

  <div className="grid grid-cols-2 gap-6 p-6">

    <div>
      <label className="mb-2 block text-sm font-medium">
        Country
      </label>

      <select className={input} name="country" value={formData.country} onChange={handleChange}>
        <option>India</option>
        <option>United States</option>
        <option>United Kingdom</option>
      </select>
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium">
        State
      </label>

      <input className={input} placeholder="Madhya Pradesh" name="state" value={formData.state} onChange={handleChange} />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium">
        City
      </label>

      <input className={input} placeholder="Indore" name="city" value={formData.city} onChange={handleChange} />
    </div>

    <div>
      <label className="mb-2 block text-sm font-medium">
        Postal Code
      </label>

      <input className={input} placeholder="452001" name="postalCode" value={formData.postalCode} onChange={handleChange} />
    </div>

    <div className="col-span-2">
      <label className="mb-2 block text-sm font-medium">
        Address
      </label>

      <textarea
        rows={4}
        className={input}
        placeholder="Enter complete business address"
        name="address"
        value={formData.address}
        onChange={handleChange}
      />
    </div>

  </div>

</div>

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

  <div className="border-b p-6">

    <h2 className="text-xl font-semibold">
      Financial Information
    </h2>

  </div>

  <div className="grid grid-cols-2 gap-6 p-6">

    <input className={input} placeholder="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />

    <input className={input} placeholder="Account Number" name="accountNumber" value={formData.accountNumber} onChange={handleChange} />

    <input className={input} placeholder="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange} />

    <select className={input} name="creditTerms" value={formData.creditTerms} onChange={handleChange}>
      <option>Net 15</option>
      <option>Net 30</option>
      <option>Net 45</option>
      <option>Net 60</option>
    </select>

    <select className={input} name="currency" value={formData.currency} onChange={handleChange}>
      <option>INR</option>
      <option>USD</option>
      <option>EUR</option>
    </select>

    <select className={input} name="status" value={formData.status} onChange={handleChange}>
      <option>Active</option>
      <option>Inactive</option>
    </select>

  </div>

</div>

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

  <div className="border-b p-6">

    <h2 className="text-xl font-semibold">
      Documents
    </h2>

  </div>

  <div className="grid grid-cols-3 gap-6 p-6">

    {["GST Certificate", "PAN Card", "Vendor Agreement"].map((item) => (
      <label
        key={item}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50"
      >
        <p className="font-medium">{item}</p>

        <p className="mt-2 text-sm text-slate-500">
          Click to Upload
        </p>

        <input type="file" className="hidden" />
      </label>
    ))}

  </div>

</div>

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

  <div className="border-b p-6">

    <h2 className="text-xl font-semibold">
      Additional Notes
    </h2>

  </div>

  <div className="p-6">

    <textarea
      rows={5}
      className={input}
      placeholder="Enter additional notes..."
      name="additionalNotes"
      value={formData.additionalNotes}
      onChange={handleChange}
    />

  </div>

</div>

<div className="flex justify-end gap-4">

  <button className="rounded-xl border border-slate-300 px-6 py-3 font-medium hover:bg-slate-100">
    Cancel
  </button>

  <button className="rounded-xl bg-slate-800 px-6 py-3 font-medium text-white hover:bg-slate-900">
    Save Draft
  </button>

  <button
  onClick={handleSubmit}
  className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
>
  Create Vendor
</button>

</div>

    </div>
  );
};

export default AddVendor;