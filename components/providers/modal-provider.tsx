"use client";

import { useEffect, useState } from "react";

//  Modals
import { CreateServerModal } from "@/components/modals/create-server-modal";
import { InviteModal } from "@/components/modals/invite-modal";

export const ModalProvider = () => {
  // States
  const [isMounted, setIsMounted] = useState(false);

  // Effects
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;
  return (
    <>
      <CreateServerModal />
      <InviteModal />
    </>
  );
};
