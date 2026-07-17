import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import HealthReport from "@/models/HealthReport";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.MY_CLOUDNARY_NAME || "i_have_api",
  api_key: process.env.CLOUDNARY_API_KEY,
  api_secret: process.env.CLOUDNARY_API_SECRET,
});

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectDB();
    const { id } = await params;

    const report = await HealthReport.findById(id);
    if (!report) {
      return NextResponse.json({ success: false, error: "Report not found" }, { status: 404 });
    }

    // Determine correct resource_type for Cloudinary deletion.
    // Images (jpg/jpeg/png) were stored as "image"; PDFs and other non-image files
    // get delivered as "raw" by Cloudinary's "auto" detection.
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const resourceType = imageExtensions.includes((report.fileType || "").toLowerCase())
      ? "image"
      : "raw";

    if (report.cloudinaryPublicId) {
      try {
        const destroyResult = await cloudinary.uploader.destroy(report.cloudinaryPublicId, {
          resource_type: resourceType,
        });

        // Fallback: if Cloudinary says "not found" under our guessed resource_type,
        // retry with the other type before giving up (handles inconsistent auto-detection).
        if (destroyResult.result !== "ok" && destroyResult.result !== "not found") {
          console.warn("Cloudinary destroy unexpected result:", destroyResult);
        }
        if (destroyResult.result === "not found") {
          const fallbackType = resourceType === "image" ? "raw" : "image";
          await cloudinary.uploader.destroy(report.cloudinaryPublicId, {
            resource_type: fallbackType,
          });
        }
      } catch (cloudErr) {
        console.error("Cloudinary deletion failed:", cloudErr);
        // Continue to delete DB record even if Cloudinary cleanup fails,
        // so the vault list doesn't get stuck with a broken entry.
      }
    }

    await HealthReport.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Report deleted from vault and Cloudinary" });
  } catch (err: any) {
    console.error("DELETE Health Report failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}