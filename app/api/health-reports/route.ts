import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import HealthReport from "@/models/HealthReport";
import { v2 as cloudinary } from "cloudinary";

// Cloudinary Configuration secure parameters
cloudinary.config({
  cloud_name: process.env.MY_CLOUDNARY_NAME || "i_have_api",
  api_key: process.env.CLOUDNARY_API_KEY,
  api_secret: process.env.CLOUDNARY_API_SECRET,
});

// GET: Fetch all medical documents
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const reports = await HealthReport.find({ patientId: "Shakila Khatoon" })
      .sort({ reportDate: -1 })
      .lean();

    return NextResponse.json({ success: true, reports });
  } catch (err: any) {
    console.error("GET Health Reports execution failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Process base64 file buffer stream directly to Cloudinary and insert metadata
export async function POST(req: NextRequest) {
  try {
    const { title, category, reportDate, fileBase64, fileName, notes } = await req.json();

    if (!title || !reportDate || !fileBase64) {
      return NextResponse.json({ success: false, error: "Missing required parameters." }, { status: 400 });
    }

    await connectDB();

    // Determine extension metadata parameters
    const fileExtension = fileName ? fileName.split(".").pop().toLowerCase() : "jpg";
    
    // Explicit format detection logic configuration
    let folderTarget = "momcare_documents";
    let resourceType: "auto" | "image" | "raw" | "video" = "auto";

    // Upload asset package to Cloudinary secure cloud container
    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        fileBase64,
        {
          folder: folderTarget,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    // Write persistent state variables inside MongoDB database engine
    const newReport = await HealthReport.create({
      patientId: "Shakila Khatoon",
      title,
      category,
      reportDate: new Date(reportDate),
      cloudinaryUrl: uploadResponse.secure_url,
      cloudinaryPublicId: uploadResponse.public_id,
      fileType: fileExtension,
      notes: notes || "",
    });

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (err: any) {
    console.error("POST Health Reports processing failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}