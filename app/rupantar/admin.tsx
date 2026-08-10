"use client";

import { ArrowRight, Upload } from "lucide-react";
import { useState } from "react";

export default function EstimateRequestForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [service, setService] = useState("Interior Designing");
  const [size, setSize] = useState("");
  const [materialPreference, setMaterialPreference] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0] ?? null;
    setFile(selectedFile);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Replace this with your current submit / WhatsApp / API logic.
    console.log({
      fullName,
      phone,
      location,
      service,
      size,
      materialPreference,
      message,
      file,
    });
  };

  return (
    <section className="w-full bg-white">
      <form
        onSubmit={handleSubmit}
        className="w-full"
      >
        {/* Heading */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-black">
            Send Estimate Request
          </h2>

          <span className="shrink-0 rounded-full bg-[#FFF0F2] px-4 py-2 text-[13px] font-semibold text-[#FF1A3D]">
            WhatsApp Fast Reply
          </span>
        </div>

        {/* Name + Phone */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />

          <input
            type="tel"
            placeholder="Phone 9745xxxxxx"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />
        </div>

        {/* Location */}
        <div className="mt-5">
          <input
            type="text"
            placeholder="Location e.g. Kathmandu"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />
        </div>

        {/* Service + Size */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <select
            value={service}
            onChange={(event) => setService(event.target.value)}
            className="h-14 w-full cursor-pointer rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition focus:border-[#FF1A3D]"
          >
            <option>Interior Designing</option>
            <option>Modular Kitchen</option>
            <option>Furniture</option>
            <option>False Ceiling</option>
            <option>Renovation</option>
            <option>Other</option>
          </select>

          <input
            type="text"
            placeholder="Approx Size (e.g. 10×12 ft)"
            value={size}
            onChange={(event) => setSize(event.target.value)}
            className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />
        </div>

        {/* Material */}
        <div className="mt-5">
          <input
            type="text"
            placeholder="Material Preference"
            value={materialPreference}
            onChange={(event) =>
              setMaterialPreference(event.target.value)
            }
            className="h-14 w-full rounded-full border border-zinc-200 bg-white px-5 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />
        </div>

        {/* Organized Upload */}
        <div className="mt-5">
          <label
            htmlFor="estimate-photo"
            className="
              group
              flex
              min-h-[148px]
              w-full
              cursor-pointer
              flex-col
              items-center
              justify-center
              rounded-[22px]
              border-2
              border-dashed
              border-zinc-200
              bg-[#fdfdfd]
              px-6
              py-6
              text-center
              transition-all
              hover:border-[#FF1A3D]/40
              hover:bg-white
              hover:shadow-[0_6px_24px_rgba(0,0,0,0.04)]
            "
          >
            {/* Native input hidden */}
            <input
              id="estimate-photo"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Icon */}
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition group-hover:text-[#FF1A3D]">
              <Upload className="h-7 w-7" strokeWidth={1.8} />
            </div>

            {/* Main text */}
            <div className="text-[14px] font-medium text-zinc-500">
              {file ? (
                <>
                  <span className="font-semibold text-zinc-900">
                    {file.name}
                  </span>

                  <div className="mt-1 text-[12px] text-[#FF1A3D]">
                    Click to change photo
                  </div>
                </>
              ) : (
                <>
                  Drag & Drop Photo or{" "}
                  <span className="font-semibold text-[#FF1A3D]">
                    Click to Upload
                  </span>
                </>
              )}
            </div>

            {/* Helper text */}
            <div className="mt-2 text-[12px] text-zinc-400">
              JPG, PNG up to 10MB
            </div>
          </label>
        </div>

        {/* Message */}
        <div className="mt-5">
          <textarea
            placeholder="Message / Requirements"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="min-h-[105px] w-full resize-none rounded-[22px] border border-zinc-200 bg-white px-5 py-4 text-[16px] text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#FF1A3D]"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="
            mt-7
            flex
            h-[61px]
            w-full
            items-center
            justify-center
            gap-3
            rounded-full
            bg-[#FF1A3D]
            text-[16px]
            font-bold
            text-white
            transition
            hover:bg-[#e91637]
            active:scale-[0.99]
          "
        >
          Send Estimate Request
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Footer */}
        <p className="mt-4 text-center text-[13px] text-zinc-500">
          We reply within 2 hours • No spam
        </p>
      </form>
    </section>
  );
}
