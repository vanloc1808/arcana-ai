import argparse
import base64
import concurrent.futures
import io
import json
import os
import sys

import requests
from dotenv import load_dotenv
from PIL import Image
from tqdm import tqdm


class ImgBBImageUploader:
    def __init__(self, api_key: str, image_dir: str, batch_size: int = 10, max_workers: int = 4):
        self.api_key = api_key
        self.image_dir = image_dir
        self.batch_size = batch_size
        self.max_workers = max_workers
        self.upload_results = {}  # Dictionary to store upload results
        # Extended list of supported formats
        self.supported_formats = {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".bmp",
            ".tiff",
            ".tif",
            ".ico",
            ".psd",
            ".svg",
            ".heic",
            ".heif",
            ".avif",
        }
        self.convert_to = ".webp"  # Default conversion format for better compression
        self.progress_bar = None
        self.api_url = "https://api.imgbb.com/1/upload"

    def _get_file_paths(self) -> list[str]:
        """Get all image file paths recursively."""
        file_paths = []
        for root, _, files in os.walk(self.image_dir):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in self.supported_formats:
                    file_paths.append(os.path.join(root, file))
        return file_paths

    def _optimize_image(self, image_path: str) -> bytes:
        """Optimize and convert image to preferred format."""
        try:
            with Image.open(image_path) as img:
                # Convert to RGB if necessary (for PNG with transparency)
                if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                    img = img.convert("RGB")

                # Create a BytesIO object to store the optimized image
                output = io.BytesIO()

                # Determine save parameters based on format
                save_params = {"format": self.convert_to[1:].upper(), "optimize": True}

                # Format-specific optimization settings
                if self.convert_to in [".jpg", ".jpeg"]:
                    save_params["quality"] = 85
                elif self.convert_to == ".webp":
                    save_params["quality"] = 85
                    save_params["method"] = 6  # Best compression
                elif self.convert_to == ".png":
                    save_params["optimize"] = True
                    save_params["compress_level"] = 9  # Maximum compression

                # Save with optimization
                img.save(output, **save_params)

                return output.getvalue()
        except Exception as e:
            print(f"Error optimizing {image_path}: {str(e)}")
            # Fallback to original file if optimization fails
            with open(image_path, "rb") as f:
                return f.read()

    def _upload_file(self, file_path: str) -> tuple[bool, str, str]:
        """Upload a single file to ImgBB."""
        try:
            # Optimize the image
            image_data = self._optimize_image(file_path)

            # Convert to base64
            image_b64 = base64.b64encode(image_data).decode("utf-8")

            # Prepare the payload
            payload = {
                "key": self.api_key,
                "image": image_b64,
                "name": os.path.basename(file_path),
            }

            # Upload to ImgBB
            response = requests.post(self.api_url, data=payload)
            response.raise_for_status()

            # Parse the response
            result = response.json()
            if result.get("success"):
                image_url = result["data"]["url"]
                return (
                    True,
                    f"Successfully uploaded {os.path.basename(file_path)}",
                    image_url,
                )
            else:
                error_msg = result.get("error", {}).get("message", "Unknown error")
                return False, f"Error uploading {file_path}: {error_msg}", ""
        except Exception as e:
            return False, f"Error uploading {file_path}: {str(e)}", ""

    def _process_batch(self, file_paths: list[str], batch_number: int, total_batches: int) -> dict[str, int]:
        """Process a batch of files using thread pool."""
        results = {"success": 0, "error": 0, "errors": []}

        # Update progress bar description
        self.progress_bar.set_description(f"Processing batch {batch_number}/{total_batches}")

        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            future_to_file = {executor.submit(self._upload_file, file_path): file_path for file_path in file_paths}

            for future in concurrent.futures.as_completed(future_to_file):
                file_path = future_to_file[future]
                try:
                    success, message, image_url = future.result()
                    if success:
                        results["success"] += 1
                        # Store the upload result
                        self.upload_results[os.path.basename(file_path)] = {
                            "image_url": image_url,
                            "status": "success",
                        }
                    else:
                        results["error"] += 1
                        results["errors"].append(message)
                        # Store the error result
                        self.upload_results[os.path.basename(file_path)] = {
                            "status": "error",
                            "error": message,
                        }
                except Exception as e:
                    results["error"] += 1
                    results["errors"].append(f"Error processing {file_path}: {str(e)}")
                    # Store the error result
                    self.upload_results[os.path.basename(file_path)] = {
                        "status": "error",
                        "error": str(e),
                    }

                # Update progress bar
                self.progress_bar.update(1)

        return results

    def _save_upload_results(self):
        """Save upload results to a JSON file."""
        output_file = "upload_results.json"
        with open(output_file, "w") as f:
            json.dump(self.upload_results, f, indent=2)
        print(f"\nUpload results saved to {output_file}")

    def upload_images(self):
        """Upload all images to ImgBB using batch processing."""
        file_paths = self._get_file_paths()
        total_files = len(file_paths)

        print(f"Found {total_files} images to upload")
        print(f"Processing in batches of {self.batch_size} with {self.max_workers} workers")
        print(f"Converting images to {self.convert_to} format")
        print("Starting upload process...")

        total_results = {"success": 0, "error": 0, "errors": []}

        # Initialize progress bar
        self.progress_bar = tqdm(total=total_files, desc="Overall Progress", unit="file")

        # Process files in batches
        total_batches = (total_files + self.batch_size - 1) // self.batch_size
        for i in range(0, total_files, self.batch_size):
            batch = file_paths[i : i + self.batch_size]
            batch_number = i // self.batch_size + 1
            batch_results = self._process_batch(batch, batch_number, total_batches)

            total_results["success"] += batch_results["success"]
            total_results["error"] += batch_results["error"]
            total_results["errors"].extend(batch_results["errors"])

            # Print batch summary
            print(f"\nBatch {batch_number}/{total_batches} completed:")
            print(f"Successfully uploaded: {batch_results['success']}")
            print(f"Failed uploads: {batch_results['error']}")

        # Close progress bar
        self.progress_bar.close()

        print("\nFinal Upload Summary:")
        print(f"Total files processed: {total_files}")
        print(f"Successfully uploaded: {total_results['success']}")
        print(f"Failed uploads: {total_results['error']}")

        if total_results["error"] > 0:
            print("\nErrors encountered:")
            for error in total_results["errors"]:
                print(f"- {error}")
        else:
            print("\nAll files uploaded successfully!")

        # Save upload results to JSON file
        self._save_upload_results()


def main():
    # Load environment variables
    load_dotenv()

    parser = argparse.ArgumentParser(description="Upload tarot card images to ImgBB.")
    parser.add_argument("--dir", required=True, help="Directory containing organized images")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
        help="Number of files to process in each batch",
    )
    parser.add_argument("--workers", type=int, default=4, help="Number of worker threads")
    parser.add_argument(
        "--format",
        choices=["jpg", "webp", "png", "avif"],
        default="webp",
        help="Output image format",
    )
    args = parser.parse_args()

    # Get API key from environment variable
    api_key = os.getenv("IMGBB_API_KEY")
    if not api_key:
        print("Error: IMGBB_API_KEY not found in .env file")
        sys.exit(1)

    uploader = ImgBBImageUploader(api_key, args.dir, batch_size=args.batch_size, max_workers=args.workers)
    uploader.convert_to = f".{args.format}"
    uploader.upload_images()


if __name__ == "__main__":
    main()
