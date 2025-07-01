{message.video && (
  <div className="relative">
    <video
      controls
      src={message.video}
      className="sm:max-w-[200px] rounded-md mb-2"
    />
    <a
      href={message.video}
      download
      className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition"
      title="Download video"
    >
      <Download size={16} />
    </a>
  </div>
)}
