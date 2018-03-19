
import numpy as np
import pandas as pd

import vtk
import vtk.util.numpy_support as vtk_np


class VTKActorWrapper(object):
    def __init__(self, np_array, colour_array=[], use_colour_points=False,require_transform=False, t_x=0, t_y=0, t_z=0):
        super(VTKActorWrapper, self).__init__()

        self.np_array = np_array

        n_coords = np_array.shape[0]
        n_elem = np_array.shape[1]

        self.verts = vtk.vtkPoints()
        self.cells = vtk.vtkCellArray()
        self.scalars = None

        self.pd = vtk.vtkPolyData()
        self.verts.SetData(vtk_np.numpy_to_vtk(np_array))
        self.cells_npy = np.vstack([np.ones(n_coords, dtype=np.int32),
                               np.arange(n_coords, dtype=np.int32)]).T.flatten()
        self.cells.SetCells(n_coords,vtk_np.numpy_to_vtkIdTypeArray(self.cells_npy))
        self.pd.SetPoints(self.verts)
        self.pd.SetVerts(self.cells)
        if use_colour_points:
            self.pd.GetPointData().SetScalars(colour_array)
        self.mapper = vtk.vtkPolyDataMapper()

        if require_transform:
            transform = vtk.vtkTransform()
            transform.RotateX(t_x)
            transform.RotateY(t_y)
            transform.RotateZ(t_z)
            transform_filter = vtk.vtkTransformPolyDataFilter()
            transform_filter.SetTransform(transform)
            transform_filter.SetInputDataObject(self.pd)
            transform_filter.Update()
            self.mapper.SetInputConnection(transform_filter.GetOutputPort())
        else:
            self.mapper.SetInputDataObject(self.pd)
        self.actor = vtk.vtkActor()
        self.actor.SetMapper(self.mapper)
        self.actor.GetProperty().SetRepresentationToPoints()
        self.actor.GetProperty().SetColor(0.0, 1.0, 0.0)

        # ply_writer = vtk.vtkPLYWriter()
        # ply_writer.SetInputDataObject(self.pd)
        # ply_writer.SetFileName("output.ply")
        # ply_writer.SetFileTypeToBinary()
        # ply_writer.SetDataByteOrderToLittleEndian()
        # ply_writer.SetColorModeToDefault()
        # ply_writer.SetArrayName("RGB")
        # ply_writer.SetComponent(0)
        # ply_writer.Write()


class PointCloud(object):
    def __init__(self, depth):
        super(PointCloud, self).__init__()

        """Transform a depth image into a point cloud with one point for each
        pixel in the image, using the camera transform for a camera
        centred at cx, cy with field of view fx, fy.

        depth is a 2-D ndarray with shape (rows, cols) containing
        depths from 1 to 254 inclusive. The result is a 3-D array with
        shape (rows, cols, 3). Pixels with invalid depth in the input have
        NaN for the z-coordinate in the result.

        """
        self.cx = 640/2
        self.cy = 320/2

        self.fx = 640*65.5/91.2
        self.fy = 320*91.2/65.5

        rows, cols = depth.shape

        c, r = np.meshgrid(np.arange(cols), np.arange(rows), sparse=True)
        self.z = depth / float(2**8)
        valid = (self.z > 0) & (self.z < 218)
        self.z = np.where(valid, depth, np.nan)
        self.x = np.where(valid, self.z * (c - self.cx) / self.fx, 0)
        self.y = np.where(valid, self.z * (r - self.cy) / self.fy, 0)

        self.result = np.dstack((self.x, self.y, self.z))


class VTKVisualisation(object):
    def __init__(self, actor, axis=True,):
        super(VTKVisualisation, self).__init__()

        self.ren = vtk.vtkRenderer()
        self.ren.AddActor(actor)

        self.axesActor = vtk.vtkAxesActor()
        self.axesActor.AxisLabelsOff()
        self.axesActor.SetTotalLength(1, 1, 1)
        self.ren.AddActor(self.axesActor)

        self.renWin = vtk.vtkRenderWindow()
        self.renWin.AddRenderer(self.ren)

        ## IREN
        self.iren = vtk.vtkRenderWindowInteractor()
        self.iren.SetRenderWindow(self.renWin)
        self.iren.Initialize()
        self.iren.Start()


def main():

    path_to_csv = 'living_room.csv'
    df = pd.read_csv(path_to_csv)
    points_csv = df[['X', 'Y', 'Z']].copy()
    signal_str = df['SIGNAL_STRENGTH'].values.flatten()
    vtk_signal_str = vtk_np.numpy_to_vtk(signal_str)

    npy_depth = np.load('1520468813.npy')
    point_cloud = PointCloud(npy_depth)
    npy_z = vtk_np.numpy_to_vtk(point_cloud.z)

    look_up_table = vtk.vtkLookupTable()
    look_up_table.SetTableRange(signal_str.min(), signal_str.max())
    # look_up_table.SetTableRange(0, 1)
    look_up_table.Build()

    # array = look_up_table.MapScalars(vtk_signal_str, vtk.VTK_COLOR_MODE_DEFAULT, -1)
    array = look_up_table.MapScalars(npy_z, vtk.VTK_COLOR_MODE_DEFAULT, -1)

    # actorWrapper = VTKActorWrapper(points_csv.values.flatten().reshape(-1, 3), array, use_colour_points=True)
    actorWrapper = VTKActorWrapper(point_cloud.result.reshape(-1, 3), require_transform=True, t_x=180)
    # r = vtk.vtkPLYReader()
    # r.SetFileName("output.ply")
    # r.Update()
    # ply_mapper = vtk.vtkPolyDataMapper()
    # ply_mapper.SetInputConnection(r.GetOutputPort())
    # ply_actor = vtk.vtkActor()
    # ply_actor.SetMapper(ply_mapper)

    viz = VTKVisualisation(actorWrapper.actor)
    # viz = VTKVisualisation(ply_actor)

main()
