import { useState, useEffect } from "react";
import { MapContainer as Map, TileLayer, ImageOverlay } from "react-leaflet";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import L from "leaflet";

const MapWithOverlay = () => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState([51.505, -0.09]);
  const [pdfImage, setPdfImage] = useState(null);

  // Handle PDF upload
  const handlePdfUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const pdfBlobUrl = URL.createObjectURL(file);
      setPdfUrl(pdfBlobUrl);
    }
  };

  // Update the PDF overlay when scale, rotation, or position changes
  useEffect(() => {
    if (pdfUrl) {
      convertPdfToImage(pdfUrl, scale, rotation, position).then((image) => {
        setPdfImage(image);
      });
    }
  }, [pdfUrl, scale, rotation, position]);

  // Set up PDF worker from CDN
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
  }, []);

  // Convert PDF to image using pdfjs-dist
  const convertPdfToImage = async (pdfUrl, scale, rotation, position) => {
    const pdf = await pdfjs.getDocument(pdfUrl).promise;
    const pdfPage = await pdf.getPage(pageNumber);

    // Set canvas dimensions based on the PDF page size
    const canvas = document.createElement("canvas");
    const viewport = pdfPage.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render PDF page to the canvas
    const canvasContext = canvas.getContext("2d");
    const renderContext = {
      canvasContext,
      viewport,
    };
    await pdfPage.render(renderContext).promise;

    return canvas.toDataURL(); // Return the data URL of the canvas as an image
  };

  // Custom Marker icon
  const customIcon = new L.Icon({
    iconUrl: pdfImage,
    iconSize: [38, 38],
  });

  return (
    <div>
      {/* Input for PDF file upload */}
      <input type="file" accept=".pdf" onChange={handlePdfUpload} />

      {/* Map with OpenStreetMap tiles */}
      <Map
        center={position}
        zoom={13}
        style={{ height: "500px", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* PDF overlay on the map */}

        {pdfImage && (
          <ImageOverlay
            url={pdfImage}
            bounds={[
              [position[0] - 0.005, position[1] - 0.005],
              [position[0] + 0.005, position[1] + 0.005],
            ]}
            opacity={0.5}
            zIndex={10}
            interactive
            draggable
            onDrag={(event) =>
              setPosition([event.target._latlng.lat, event.target._latlng.lng])
            }
            rotationAngle={rotation}
            rotationOrigin="center"
            style={{ transform: `scale(${scale}) rotate(${rotation}deg)` }}
          />
        )}
      </Map>

      {/* Controls for PDF navigation, scale, and rotation */}
      {pdfUrl && (
        <div>
          <p>
            Page {pageNumber} of {numPages}
          </p>
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(pageNumber - 1)}
          >
            Previous Page
          </button>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(pageNumber + 1)}
          >
            Next Page
          </button>
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={(error) => console.error("Error loading PDF:", error)}
          >
            <Page pageNumber={pageNumber} />
          </Document>
          <div>
            <label>
              Scale:
              <input
                type="number"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                step={0.1}
              />
            </label>
          </div>
          <div>
            <label>
              Rotation:
              <input
                type="number"
                value={rotation}
                onChange={(e) => setRotation(parseFloat(e.target.value))}
                step={1}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapWithOverlay;
