package com.arwheelapp.modules

import android.os.Bundle
import android.view.Gravity
import android.widget.Button
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import android.content.pm.PackageManager
import android.util.Log
// import com.google.ar.core.Frame
// import com.google.ar.core.Session
import com.google.ar.core.Config
import com.google.ar.core.AugmentedImage
import com.google.ar.core.TrackingState

import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.arcore
import com.arapp.utils.OnnxRuntimeHandler
import com.arapp.utils.FrameConverter
import com.arapp.utils.PositionHandler

class ARActivity : ComponentActivity() {

    private lateinit var arSceneView: ARSceneView
    private lateinit var onnxHandler: OnnxRuntimeHandler
    private lateinit var boxOverlay: OnnxOverlayView
    private lateinit var frameConverter: FrameConverter
    private lateinit var positionHandler: PositionHandler
    private lateinit var markerBased: ARMarkerBased
    private lateinit var markerless: ARMarkerless

    private var arSession: Session? = null
    private var isARSessionStarted = false

	private const val TAG = "ARActivity"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

		initViews()
		setupAR()

		startAR()
    }

    private fun initViews() {
        val rootLayout = FrameLayout(this)

        arSceneView.apply {
			arCore.cameraPermissionLauncher = registerForActivityResult(
				androidx.activity.result.contract.ActivityResultContracts.RequestPermission()
			)
        }

        rootLayout.addView(
            arSceneView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        )
        Log.d(TAG, "ARSceneView added to layout")

        val backButton = Button(this).apply {
            text = "Back to Home"
            setOnClickListener { finish() }
        }
        val buttonParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT,
            FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            gravity = Gravity.CENTER_HORIZONTAL or Gravity.BOTTOM
            val marginBottom = (resources.displayMetrics.heightPixels * 0.2f).toInt()
            setMargins(0, 0, 0, marginBottom)
        }
        rootLayout.addView(backButton, buttonParams)

        setContentView(rootLayout)
        Log.d(TAG, "Views set")
    }

	private fun setupAR() {
		aRsession = Session(this)
		val config = Config(session).apply {
			updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
			planeFindingMode = Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL
			lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
			instantPlacementMode = Config.InstantPlacementMode.LOCAL_Y_UP
			focusMode = Config.FocusMode.AUTO

			if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
				depthMode = Config.DepthMode.AUTOMATIC
			}
		}

		try {
			session.configure(config)
			Log.d(TAG, "AR Session configured successfully")
		} catch (e: Exception) {
			Log.e(TAG, "Failed to configure AR session: ", e)
			throw e
		}

		arSceneView.session(arSession)
		arSceneView.apply {
			lightEstimator.isEnabled = true
		}
	}

	// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    private fun startAR() {
		session = aRsession?
		arSceneView.onFrame = { frame ->
			Log.d(TAG, "Frame: timestamp=${frame.timestamp}")
			tensor = frameConverter(frame)
			output = onnxHandler.runOnnxInference(tensor)
			pos3d = positionHandler.getPos3d(output)
			boxOverlay(output)
			markerBased.renderModel(output)
			markerless.renderModel(pos3d)
		}
    }

    override fun onResume() {
        super.onResume()

		if (arSceneView.session == null) {
			setupAR()
		}

		try {
			arSceneView.session.resume()
		} catch (e: Exception) {
			Log.e(TAG, "Failed to resume ArSceneView: ", e)
		}
    }

    override fun onPause() {
		super.onPause()
		try {
			arSceneView.session.pause()
		} catch (e: Exception) {
			Log.e(TAG, "Failed to pause ArSceneView: ", e)
		}
    }

    override fun onDestroy() {
		arSession?.close()
		arSession = null
		try {
			arSceneView.session.destroy()
		} catch (e: Exception) {
			Log.e(TAG, "Failed to destroy ArSceneView: ", e)
		}
		super.onDestroy()
    }
}