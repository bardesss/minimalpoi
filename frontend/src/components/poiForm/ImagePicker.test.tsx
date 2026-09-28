import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePicker } from "./ImagePicker";

describe("ImagePicker", () => {
  it("renders an 'Add photo' label tied to the hidden file input", () => {
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={vi.fn()} />);
    const label = screen.getByText("Add photo");
    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveAttribute("for", "poi-image");
  });

  it("reads 'Change photo' once an image is set", () => {
    render(<ImagePicker imageUrl="https://img.example/p.jpg" onImageUrl={vi.fn()} onUploadImage={vi.fn()} />);
    expect(screen.getByText("Change photo")).toBeInTheDocument();
  });

  it("shows a 'Take photo' camera input on mobile with capture=environment", () => {
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={vi.fn()} mobile />);
    const cameraInput = screen.getByLabelText(/take photo/i);
    expect(cameraInput).toHaveAttribute("capture", "environment");
    expect(cameraInput).toHaveAttribute("accept", "image/*");
  });

  it("does not show the camera input off mobile", () => {
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={vi.fn()} />);
    expect(screen.queryByLabelText(/take photo/i)).not.toBeInTheDocument();
  });

  it("uploads through the regular file input", async () => {
    const onUploadImage = vi.fn().mockResolvedValue({ url: "/images/up.webp" });
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={onUploadImage} />);
    await userEvent.upload(screen.getByLabelText(/add photo/i), new File(["x"], "p.png", { type: "image/png" }));
    expect(onUploadImage).toHaveBeenCalled();
  });

  it("uploads through the camera input", async () => {
    const onUploadImage = vi.fn().mockResolvedValue({ url: "/images/up.webp" });
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={onUploadImage} mobile />);
    await userEvent.upload(screen.getByLabelText(/take photo/i), new File(["x"], "p.png", { type: "image/png" }));
    expect(onUploadImage).toHaveBeenCalled();
  });

  it("visually hides the native inputs but keeps them focusable", () => {
    render(<ImagePicker imageUrl={null} onImageUrl={vi.fn()} onUploadImage={vi.fn()} mobile />);
    const fileInput = screen.getByLabelText(/add photo/i);
    // jsdom normalizes the computed `overflow: hidden` to `clip`; the source style is unaffected.
    expect(fileInput).toHaveStyle({ position: "absolute", width: "1px", height: "1px", opacity: "0" });
    expect(["hidden", "clip"]).toContain(fileInput.style.overflow);
  });
});
