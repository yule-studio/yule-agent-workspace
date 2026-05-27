import { redirect } from 'next/navigation';

/**
 * The app is the pixel-art Yule Agent Workspace — there is no operational
 * dashboard. Entering at the root lands straight in the Pixel Office.
 */
export default function Home() {
  redirect('/office');
}
