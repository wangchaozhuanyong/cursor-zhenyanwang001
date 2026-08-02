import { act, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutAddressCard } from "./CheckoutAddressCard";

vi.mock("@/modules/micro-interactions", () => ({
  AppModal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: ReactNode;
    children: ReactNode;
    footer: ReactNode;
  }) => open ? (
    <section role="dialog" aria-label={String(title)}>
      {children}
      {footer}
    </section>
  ) : null,
  SquishButton: ({
    variant: _variant,
    children,
    ...props
  }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button {...props}>{children}</button>
  ),
  usePreferBottomSheet: () => false,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type InitialValues = {
  name?: string;
  phone?: string;
  address?: string;
};

function AddressHarness({ initialValues = {} }: { initialValues?: InitialValues }) {
  const [name, setName] = useState(initialValues.name ?? "");
  const [phone, setPhone] = useState(initialValues.phone ?? "");
  const [address, setAddress] = useState(initialValues.address ?? "");

  return (
    <CheckoutAddressCard
      name={name}
      phone={phone}
      address={address}
      onNameChange={setName}
      onPhoneChange={setPhone}
      onAddressChange={setAddress}
      onSelectedAddressChange={vi.fn()}
      onChooseAddress={vi.fn()}
    />
  );
}

describe("CheckoutAddressCard", () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    if (root) {
      act(() => {
        root?.unmount();
      });
    }
    container?.remove();
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  function renderCard(initialValues?: InitialValues) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      root?.render(<AddressHarness initialValues={initialValues} />);
    });
    return container;
  }

  function openEditor(view: HTMLDivElement) {
    const trigger = Array.from(view.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "填写" || button.textContent?.trim() === "修改",
    );
    act(() => {
      trigger?.click();
    });
  }

  function completeEditor(view: HTMLDivElement) {
    const complete = Array.from(view.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.trim() === "完成",
    );
    act(() => {
      complete?.click();
    });
  }

  it("uses an h2 section title and persistent required field labels", () => {
    const view = renderCard();
    expect(view.querySelector("h2")).toHaveTextContent("收货信息");

    openEditor(view);

    const nameInput = view.querySelector<HTMLInputElement>('input[name="name"]');
    const phoneInput = view.querySelector<HTMLInputElement>('input[name="tel"]');
    const addressInput = view.querySelector<HTMLInputElement>('input[name="street-address"]');

    expect(nameInput?.labels?.[0]).toHaveTextContent("收货人姓名");
    expect(phoneInput?.labels?.[0]).toHaveTextContent("联系电话");
    expect(addressInput?.labels?.[0]).toHaveTextContent("收货地址");
    expect(nameInput).toBeRequired();
    expect(phoneInput).toBeRequired();
    expect(addressInput).toBeRequired();
    expect(nameInput).toHaveAttribute("autocomplete", "shipping name");
    expect(phoneInput).toHaveAttribute("autocomplete", "shipping tel");
    expect(addressInput).toHaveAttribute("autocomplete", "shipping street-address");
  });

  it("keeps the editor open, marks fields, and focuses the first invalid field", () => {
    const view = renderCard();
    openEditor(view);
    completeEditor(view);

    const nameInput = view.querySelector<HTMLInputElement>('input[name="name"]');
    const phoneInput = view.querySelector<HTMLInputElement>('input[name="tel"]');
    const addressInput = view.querySelector<HTMLInputElement>('input[name="street-address"]');

    expect(view.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(phoneInput).toHaveAttribute("aria-invalid", "true");
    expect(addressInput).toHaveAttribute("aria-invalid", "true");
    expect(nameInput?.getAttribute("aria-describedby")).toBeTruthy();
    expect(document.activeElement).toBe(nameInput);
  });

  it("rejects an invalid Malaysian phone and closes for valid values", () => {
    const invalidView = renderCard({ name: "张三", phone: "123", address: "Kuala Lumpur" });
    openEditor(invalidView);
    completeEditor(invalidView);

    const phoneInput = invalidView.querySelector<HTMLInputElement>('input[name="tel"]');
    expect(phoneInput).toHaveAttribute("aria-invalid", "true");
    expect(document.activeElement).toBe(phoneInput);
    expect(invalidView.textContent).toContain("马来西亚手机号格式不正确");

    act(() => {
      root?.unmount();
    });
    container?.remove();
    root = null;
    container = null;

    const validView = renderCard({ name: "张三", phone: "0123456789", address: "Kuala Lumpur" });
    openEditor(validView);
    completeEditor(validView);

    expect(validView.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });
});
