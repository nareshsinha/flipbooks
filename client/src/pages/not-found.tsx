// import { Card, CardContent } from "@/components/ui/card";
// import { AlertCircle } from "lucide-react";

// export default function NotFound() {
//   return (
//     <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
//       <Card className="w-full max-w-md mx-4">
//         <CardContent className="pt-6">
//           <div className="flex mb-4 gap-2">
//             <AlertCircle className="h-8 w-8 text-red-500" />
//             <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
//           </div>

//           <p className="mt-4 text-sm text-gray-600">
//             Did you forget to add the page to the router?
//           </p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";
//import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <Card className="w-full max-w-md mx-4 backdrop-blur-sm bg-white/70 border-0 shadow-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
        <CardContent className="pt-8 pb-6">
          {/* Main icon with pulse animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-red-100 rounded-full animate-ping"></div>
              <AlertCircle className="h-16 w-16 text-red-500 relative z-10" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center space-y-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                404
              </h1>
              <h2 className="text-xl font-semibold text-gray-800 mt-2">
                Page Not Found
              </h2>
            </div>

            <p className="text-gray-600 leading-relaxed">
              Oops! The page you're looking for seems to have wandered off into the digital void.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-yellow-800 font-medium">
                💡 Did you forget to add this page to the router?
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <a 
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Home className="h-4 w-4" />
                Go Home
              </a>
              <button 
                onClick={() => window.history.back()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add custom animations to tailwind config */}
      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}