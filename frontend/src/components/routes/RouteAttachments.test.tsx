import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RouteAttachments from "./RouteAttachments";
import type { RouteAttachment } from "../../types/api";

const upload = vi.fn();
const del = vi.fn();
vi.mock("../../queries/hooks", () => ({
  useUploadRouteAttachment: () => ({ mutate: upload, isPending: false }),
  useDeleteRouteAttachment: () => ({ mutate: del, isPending: false }),
}));

beforeEach(() => {
  upload.mockClear();
  del.mockClear();
});

const pdf: RouteAttachment = {
  id: 3, route_id: 1, node_id: null, filename: "hotel.pdf", content_type: "application/pdf",
  size: 2048, uploaded_by: 1, uploaded_at: "2026-07-14T00:00:00Z",
};

describe("RouteAttachments", () => {
  it("uploads a chosen file with the node id", () => {
    render(<RouteAttachments routeId={1} nodeId={5} attachments={[]} canEdit />);
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], "hotel.pdf", { type: "application/pdf" });
    const input = screen.getByLabelText(/add file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(upload).toHaveBeenCalledWith({ file, nodeId: 5 });
  });

  it("lists an existing attachment with a download link", () => {
    render(<RouteAttachments routeId={1} nodeId={5} attachments={[pdf]} canEdit />);
    const link = screen.getByRole("link", { name: /hotel\.pdf/i });
    expect(link).toHaveAttribute("href", "/api/routes/1/attachments/3");
  });

  it("deletes an attachment when editable", () => {
    render(<RouteAttachments routeId={1} nodeId={5} attachments={[pdf]} canEdit />);
    fireEvent.click(screen.getByRole("button", { name: /delete hotel\.pdf/i }));
    expect(del).toHaveBeenCalledWith(3);
  });

  it("hides upload and delete controls in read-only mode", () => {
    render(<RouteAttachments routeId={1} nodeId={5} attachments={[pdf]} canEdit={false} />);
    expect(screen.queryByLabelText(/add file/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete hotel\.pdf/i })).not.toBeInTheDocument();
  });
});
