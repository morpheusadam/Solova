"use server";

import { AuthError } from "next-auth";

import { signIn } from "~/server/auth";

export async function signInAction(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Invalid email or password. Please try again." };
    }
    throw error;
  }
}
