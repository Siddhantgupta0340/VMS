import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Landmark,
  CreditCard,
  Calendar,
  BadgeCheck,
} from "lucide-react";

const Row = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-500">
      {label}
    </p>

    <p className="mt-1 text-sm font-medium text-slate-900">
      {value || "-"}
    </p>
  </div>
);

const VendorDetails = ({ vendor, onClose }) => {
  if (!vendor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">

      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* Header */}

        <div className="flex items-center justify-between border-b px-8 py-6">

          <div>

            <h2 className="text-3xl font-bold">
              {vendor.companyName}
            </h2>

            <p className="mt-1 text-slate-500">
              Vendor Code : {vendor.vendorCode}
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X />
          </button>

        </div>

        <div className="space-y-8 p-8">

          {/* Company */}

          <section>

            <div className="mb-5 flex items-center gap-3">

              <Building2 className="text-blue-600" />

              <h3 className="text-xl font-semibold">
                Company Information
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-6">

              <Row label="Company Name" value={vendor.companyName} />

              <Row label="Vendor Code" value={vendor.vendorCode} />

              <Row label="Category" value={vendor.category} />

              <Row label="Status" value={vendor.status} />

              <Row label="GST" value={vendor.gst} />

            </div>

          </section>

          {/* Contact */}

          <section>

            <div className="mb-5 flex items-center gap-3">

              <User className="text-blue-600" />

              <h3 className="text-xl font-semibold">
                Contact Information
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-6">

              <Row label="Contact Person" value={vendor.contactPerson} />

              <Row label="Email" value={vendor.email} />

              <Row label="Phone" value={vendor.phone} />

            </div>

          </section>

          {/* Address */}

          <section>

            <div className="mb-5 flex items-center gap-3">

              <MapPin className="text-blue-600" />

              <h3 className="text-xl font-semibold">
                Business Address
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-6">

              <Row label="Address" value={vendor.address} />

              <Row label="City" value={vendor.city} />

              <Row label="State" value={vendor.state} />

              <Row label="Postal Code" value={vendor.postalCode} />

            </div>

          </section>

          {/* Banking */}

          <section>

            <div className="mb-5 flex items-center gap-3">

              <CreditCard className="text-blue-600" />

              <h3 className="text-xl font-semibold">
                Banking Details
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-6">

              <Row label="Account Number" value={vendor.bankAccountNo} />

              <Row label="IFSC Code" value={vendor.ifscCode} />
              
              <Row label="Payment Terms" value={vendor.paymentTerms} />

            </div>

          </section>

          {/* Audit */}

          <section>

            <div className="mb-5 flex items-center gap-3">

              <Calendar className="text-blue-600" />

              <h3 className="text-xl font-semibold">
                Audit Information
              </h3>

            </div>

            <div className="grid grid-cols-2 gap-6">

              <Row label="Created By" value={vendor.createdBy} />

              <Row label="Created At" value={vendor.createdAt} />

              <Row label="Approved By" value={vendor.approvedBy} />

              <Row label="Approved At" value={vendor.approvedAt} />

            </div>

          </section>

        </div>

      </div>

    </div>
  );
};

export default VendorDetails;