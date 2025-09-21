import { currentUser, auth } from "@clerk/nextjs/server";

import { db } from "@/lib/db";

export const initialProfile = async () => {
  const { redirectToSignIn } = await auth();
  const user = await currentUser();

  // Redirect to sign in if there is no user logged in
  if (!user) {
    return null;
  }

  const profile = await db.profile.findUnique({
    where: {
      userId: user?.id,
    },
  });

  // if already have a profile
  if (profile) {
    return profile;
  }

  // create new profile
  const newProfile = await db.profile.create({
    data: {
      userId: user?.id as never,
      name: `${user?.firstName} ${user?.lastName}`,
      imageUrl: user?.imageUrl as never,
      email: user?.emailAddresses[0].emailAddress as never,
    },
  });

  return newProfile;
};
