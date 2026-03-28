"use client"; // Make sure this is at the top of the file

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const HomePage = () => {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the /signin page
        router.push("/signin");
    }, [router]);

    return null; // Optionally, show a loading spinner or message
};

export default HomePage;
