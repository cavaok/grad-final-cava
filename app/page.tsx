import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-2">Investigating Adversarial Examples as a Universal Property of Trainable Models</h1>
        <h2 className="text-2xl font-semibold mb-4">Interactive Results Dashboard</h2>
        <div className="mb-4 text-lg">
          <p className="mb-6">
            Hi! I'm Olivia. I just defended my MS Thesis in Data Science, and this is an interactive exploration of my results.
            Overall, these visualizations are designed to help you understand the presence of adversarial examples across a wide variety of trainable models.
          </p>

          <p className="mb-6">
          Click <Link href="/help" className="text-blue-500 hover:underline">Learn More</Link> in the cards below if you are interested to learn about my thesis, the data, and the metrics used in this dashboard. Otherwise, start exploring via the other links! 
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mt-8">
          <Link 
            href="/help"
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="w-16 h-16 flex items-center justify-center bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <Image
                src="/file.svg"
                alt="Learn icon"
                width={32}
                height={32}
                className="dark:invert"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">Learn More</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Understand adversarial examples and how to interpret the visualizations
            </p>
          </Link>
          
          <Link 
            href="/dashboard"
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="w-16 h-16 flex items-center justify-center bg-green-100 dark:bg-green-900 rounded-full mb-4">
              <Image
                src="/window.svg"
                alt="Analytics icon"
                width={32}
                height={32}
                className="dark:invert"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">Analytics</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Explore Frobenius norm distributions across different models
            </p>
          </Link>
          
          <Link 
            href="/pca-visualization"
            className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="w-16 h-16 flex items-center justify-center bg-purple-100 dark:bg-purple-900 rounded-full mb-4">
              <Image
                src="/globe.svg"
                alt="3D visualization icon"
                width={32}
                height={32}
                className="dark:invert"
              />
            </div>
            <h2 className="text-xl font-semibold mb-2">PCA Projection</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              View 3D visualization of adversarial examples in principal component space
            </p>
          </Link>
        </div>
      </main>
      <footer className="row-start-3 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>CS 573 Data Visualization Final Project @ Worcester Polytechnic Institute</p>
      </footer>
    </div>
  );
}